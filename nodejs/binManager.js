const nodeUtils = require('khala-nodeutils');
const {exec, execResponsePrint, execDetach, killProcess, findProcess} = nodeUtils.devOps();
const path = require('path');
const yaml = nodeUtils.yaml();
const logger = nodeUtils.devLogger('binManager');

class BinManager {
	constructor(binPath = process.env.binPath) {
		this.binPath = binPath;
	}

	/**
	 * @param {string} action start|stop
	 */
	async configtxlator(action) {
		if (action === 'start') {
			const CMD = path.resolve(this.binPath, `configtxlator start`);
			logger.info('CMD', CMD);
			execDetach(CMD);
		} else {
			const matched = await findProcess('port', 7059);
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
