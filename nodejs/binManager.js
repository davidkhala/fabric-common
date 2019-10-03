const {devOps, yaml, devLogger} = require('khala-nodeutils');
const {exec, execResponsePrint, execDetach, killProcess, findProcess} = devOps;
const path = require('path');
const fs = require('fs');
const logger = devLogger('binManager');

class BinManager {
	constructor(binPath = process.env.binPath) {
		if (!binPath) {
			throw Error('BinManager: environment <binPath> is undefined');
		}
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
				const CMD = path.resolve(this.binPath, `configtxlator proto_encode --type=${type} --input=${inputFile} --output=${outputFile}`);
				await exec(CMD);
			},
			/**
			 *
			 * @param type
			 * @param {json} updateConfigJSON
			 * @return {Buffer}
			 */
			encode: async (type, updateConfigJSON) => {
				const Tmp = require('tmp');
				const tmpJSONFile = Tmp.fileSync({postfix: '.json'}).name;
				const tmpFile = Tmp.fileSync().name;
				fs.writeFileSync(tmpJSONFile, updateConfigJSON);
				await this.configtxlatorCMD.encodeFile(type, {inputFile: tmpJSONFile, outputFile: tmpFile});
				return fs.readFileSync(tmpFile);// TODO debug encoding option
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
				const CMD = `configtxlator proto_decode --type=${type} --input=${inputFile} ${outputFile ? `--output=${outputFile}` : ''}`;
				await exec(path.resolve(this.binPath, CMD));
			},
			/**
			 *
			 * @param type
			 * @param original_config_proto
			 * @return {Promise<json>} original_config
			 */
			decode: async (type, original_config_proto) => {
				const Tmp = require('tmp');
				const tmpFile = Tmp.fileSync().name;
				const tmpJSONFile = Tmp.fileSync({postfix: '.json'}).name;
				fs.writeFileSync(tmpFile, original_config_proto);

				await this.configtxlatorCMD.decodeFile(type, {inputFile: tmpFile, outputFile: tmpJSONFile});
				return JSON.stringify(require(tmpJSONFile));
			},
			/**
			 * Takes two marshaled common.Config messages and computes the config update which transitions between the two.
			 * @param {string} channelID The name of the channel for this update.
			 * @param original The original config message.(file path)
			 * @param updated The updated config message.(file path)
			 * @param output A file to write the proto message to. //TODO ?? or "A file to write the JSON document to."
			 */
			compute_update: async (channelID, original, updated, {output = '/dev/stdout'}) => {
				const CMD = path.resolve(this.binPath, `configtxlator compute_update --channel_id=${channelID} --original=${original} 
				--updated=${updated}  --output=${output}`);
				const result = await exec(CMD);
				execResponsePrint(result);
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
			const CMD = path.resolve(this.binPath, `configtxlator start --hostname=${hostname} --port=${port} ${CORS.reduce(CORSReducer, '')}`);
			logger.info('CMD', CMD);
			execDetach(CMD);
		} else {
			const matched = await findProcess('port', port);
			const process = matched[0];
			if (process) {
				await killProcess(process.pid);
			}
		}
	}

	configtxgen(profile, configtxYaml, channelName) {

		const configPath = path.dirname(configtxYaml);

		return {

			genBlock: async (outputFile) => {
				if (!channelName) {
					channelName = 'testchainid';
				}
				const CMD = `${this.binPath}/configtxgen -outputBlock ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`;
				logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
			},
			genChannel: async (outputFile) => {
				const CMD = `${this.binPath}/configtxgen -outputCreateChannelTx ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`;
				logger.info('CMD', CMD);
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
				logger.info('CMD', CMD);
				const result = await exec(CMD);
				execResponsePrint(result);
			},
			viewBlock: async (blockFile) => {
				const CMD = `${this.binPath}/configtxgen -inspectBlock ${blockFile} -profile ${profile} -configPath ${configPath}`;
				logger.info('CMD', CMD);
				const result = await exec(CMD);
				console.error('stderr[start]\n', result.stderr, '[end]stderr');
				return JSON.parse(result.stdout);
			},
			viewChannel: async (channelFile) => {
				const CMD = `${this.binPath}/configtxgen -inspectChannelCreateTx ${channelFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`;
				logger.info('CMD', CMD);
				const result = await exec(CMD);
				console.error('stderr[start]\n', result.stderr, '[end]stderr');
				return JSON.parse(result.stdout);
			}
		};
	}
}


module.exports = BinManager;
