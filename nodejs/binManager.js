const {exec, execResponsePrint, execDetach, killProcess, findProcess} = require('khala-nodeutils/devOps');
const yaml = require('khala-nodeutils/yaml');
const path = require('path');
const fs = require('fs');
const {createTmpFile, createTmpDir} = require('khala-nodeutils/tmp');

class BinManager {
	_buildCMD(executable, args) {
		return `${path.resolve(this.binPath, executable)} ${args}`;
	}

	/**
	 *
	 * @param binPath
	 * @param [logger]
	 */
	constructor(binPath = process.env.binPath, logger = console) {
		if (!fs.lstatSync(binPath).isDirectory()) {
			throw Error('BinManager: environment <binPath> is not a directory');
		}
		this.logger = logger;
		this.binPath = binPath;
		// TODO how to use streaming buffer to exec
		this.configtxlatorCMD = {
			/**
			 * Converts a JSON document to protobuf.
			 * @param {string} type The type of protobuf structure to encode to.
			 * @param {string} inputFile A file containing the JSON document.
			 * @param {string} outputFile A file to write the output to.
			 */
			encodeFile: async (type, {inputFile, outputFile}) => {
				if (!['common.Config', 'common.ConfigUpdate'].includes(type)) {
					throw Error(`Unsupported encode type: ${type}`);
				}
				const CMD = this._buildCMD('configtxlator', `proto_encode --type=${type} --input=${inputFile} --output=${outputFile}`);
				await exec(CMD);
			},
			/**
			 *
			 * @param type
			 * @param {json} updateConfigJSON
			 * @return {Buffer}
			 */
			encode: async (type, updateConfigJSON) => {

				const [tmpJSONFile, t1] = createTmpFile({postfix: '.json'});
				const [tmpFile, t2] = createTmpFile();
				fs.writeFileSync(tmpJSONFile, updateConfigJSON);
				await this.configtxlatorCMD.encodeFile(type, {inputFile: tmpJSONFile, outputFile: tmpFile});
				const returned = fs.readFileSync(tmpFile);
				t1();
				t2();
				return returned;
			},
			/**
			 * Converts a proto message to JSON.
			 * @param {string} type The type of protobuf structure to decode from.
			 * @param {string} inputFile A file containing the proto message.
			 * @param {string} outputFile A file to write the JSON document to.
			 * @return {json} original_config
			 */
			decodeFile: async (type, {inputFile, outputFile}) => {
				if (!['common.Config'].includes(type)) {
					throw Error(`Unsupported encode type: ${type}`);
				}
				const CMD = this._buildCMD('configtxlator', `proto_decode --type=${type} --input=${inputFile} ${outputFile ? `--output=${outputFile}` : ''}`);
				await exec(CMD);
			},
			/**
			 *
			 * @param type
			 * @param original_config_proto
			 * @return {Promise<json|string>} original_config
			 */
			decode: async (type, original_config_proto) => {
				const [tmpFile, t1] = createTmpFile();
				const [tmpJSONFile, t2] = createTmpFile({postfix: '.json'});
				fs.writeFileSync(tmpFile, original_config_proto);

				await this.configtxlatorCMD.decodeFile(type, {inputFile: tmpFile, outputFile: tmpJSONFile});
				const returned = JSON.stringify(require(tmpJSONFile));

				t1();
				t2();
				return returned;
			},
			/**
			 * Takes two marshaled common.Config messages and computes the config update which transitions between the two.
			 * @param {string} channelID The name of the channel for this update.
			 * @param {string} original The original config message.(file path)
			 * @param {string} updated The updated config message.(file path)
			 * @param {string} outputFile A file to write the config update message to. //TODO fabric document "A file to write the JSON document to."
			 */
			computeUpdateFile: async (channelID, original, updated, outputFile) => {
				const CMD = this._buildCMD('configtxlator', `compute_update --channel_id=${channelID} --original=${original} --updated=${updated}  --output=${outputFile}`);
				await exec(CMD);
			},
			/**
			 *
			 * @param channelID
			 * @param {Buffer} original_config_proto The original config message
			 * @param {Buffer} updated_config_proto The updated config message
			 * @return {Promise<Buffer>} modified_config_proto
			 */
			computeUpdate: async (channelID, original_config_proto, updated_config_proto) => {
				const [tmpFileOriginal, t1] = createTmpFile();
				const [tmpFileUpdated, t2] = createTmpFile();
				const [tmpFileOutput, t3] = createTmpFile();
				fs.writeFileSync(tmpFileOriginal, original_config_proto);
				fs.writeFileSync(tmpFileUpdated, updated_config_proto);
				await this.configtxlatorCMD.computeUpdateFile(channelID, tmpFileOriginal, tmpFileUpdated, tmpFileOutput);
				const returned = fs.readFileSync(tmpFileOutput);
				t1();
				t2();
				t3();
				return returned;
			}
		};
	}

	/**
	 * @param {string} action start|stop
	 * @param {string} hostname The hostname or IP on which the REST server will listen
	 * @param {number} port The port on which the REST server will listen
	 * @param {string[]} CORS Allowable CORS domains, e.g. ['*'] or ['www.example.com']
	 */
	async configtxlatorRESTServer(action, {hostname = '0.0.0.0', port = 7059, CORS = ['*']} = {}) {
		if (action === 'start') {

			const CORSReducer = (opt, entry) => {
				return opt + `--CORS=${entry}`;
			};
			const CMD = this._buildCMD('configtxlator', `start --hostname=${hostname} --port=${port} ${CORS.reduce(CORSReducer, '')}`);
			this.logger.info('CMD', CMD);
			execDetach(CMD);
		} else {
			const matched = await findProcess('port', port);
			const process = matched[0];
			if (process) {
				await killProcess(process.pid);
			}
		}
	}

	peer() {
		return {
			/**
			 * Signs the supplied configtx update file in place on the filesystem.
			 * [Inline signing] command output file path is same as configtxUpdateFile (overwrite)
			 * @param {string} configtxUpdateFile file path
			 * @param {string} localMspId
			 * @param {string} mspConfigPath
			 */
			signconfigtx: async (configtxUpdateFile, localMspId, mspConfigPath) => {
				const [FABRIC_CFG_PATH, t1] = createTmpDir();
				fs.writeFileSync(path.resolve(FABRIC_CFG_PATH, 'core.yml'), '');
				process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;
				process.env.CORE_PEER_LOCALMSPID = localMspId;
				process.env.CORE_PEER_MSPCONFIGPATH = mspConfigPath;
				const CMD = this._buildCMD('peer', `channel signconfigtx --file ${configtxUpdateFile}`);
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
				t1();
			},

			/**
			 *
			 * @param chaincodeId
			 * @param chaincodePath
			 * @param [chaincodeType]
			 * @param chaincodeVersion
			 * @param [metadataPath]
			 * @param localMspId
			 * @param mspConfigPath
			 * @param outputFile
			 * @param [instantiatePolicy]
			 * @return {Promise<*>}
			 */
			package: async ({chaincodeId, chaincodePath, chaincodeType, chaincodeVersion, metadataPath},
			                {localMspId, mspConfigPath}, outputFile, instantiatePolicy) => {
				const [FABRIC_CFG_PATH, t1] = createTmpDir();
				fs.writeFileSync(path.resolve(FABRIC_CFG_PATH, 'core.yml'), '');
				process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;
				process.env.CORE_PEER_LOCALMSPID = localMspId;
				process.env.CORE_PEER_MSPCONFIGPATH = mspConfigPath;
				let optionTokens = `--name ${chaincodeId} --path ${chaincodePath} --version ${chaincodeVersion}`;
				if (instantiatePolicy) {
					optionTokens += ` --instantiate-policy ${instantiatePolicy} --cc-package`;
				}
				if (chaincodeType) {
					optionTokens += ` --lang ${chaincodeType}`;
				}
				const CMD = this._buildCMD('peer', `chaincode package ${optionTokens} ${outputFile}`);
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
				t1();
				delete process.env.FABRIC_CFG_PATH;
				delete process.env.CORE_PEER_LOCALMSPID;
				delete process.env.CORE_PEER_MSPCONFIGPATH;
				return outputFile;
			}
		};
	}


	configtxgen(profile, configtxYaml, channelName) {

		const configPath = path.dirname(configtxYaml);

		return {

			genBlock: async (outputFile) => {
				if (!channelName) {
					channelName = 'testchainid';
				}
				const CMD = `${this.binPath}/configtxgen -outputBlock ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`;
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
			},
			genChannel: async (outputFile) => {
				const CMD = `${this.binPath}/configtxgen -outputCreateChannelTx ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`;
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
			},
			genAnchorPeers: async (outputFile, asOrg) => {

				const configtxYamlCheck = () => {
					const readResult = yaml.read(configtxYaml);
					const orgs = readResult.Profiles[profile].Application.Organizations;
					if (!Array.isArray(orgs)) {
						throw Error('invalid configYaml:Organizations is not array');
					}
				};
				configtxYamlCheck();

				const CMD = `${this.binPath}/configtxgen -outputAnchorPeersUpdate ${outputFile} -profile ${profile} -channelID ${channelName} -asOrg ${asOrg} -configPath ${configPath}`;
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
			},
			viewBlock: async (blockFile) => {
				const CMD = `${this.binPath}/configtxgen -inspectBlock ${blockFile} -profile ${profile} -configPath ${configPath}`;
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				this.logger.error('stderr[start]\n', result.stderr, '[end]stderr');
				return JSON.parse(result.stdout);
			},
			viewChannel: async (channelFile) => {
				const CMD = `${this.binPath}/configtxgen -inspectChannelCreateTx ${channelFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`;
				this.logger.info('CMD', CMD);
				const result = await exec(CMD);
				this.logger.error('stderr[start]\n', result.stderr, '[end]stderr');
				return JSON.parse(result.stdout);
			}
		};
	}
}


module.exports = BinManager;
