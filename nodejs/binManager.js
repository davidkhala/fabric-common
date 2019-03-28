const {exec} = require('khala-nodeutils').helper();

const nodeUtils = require('khala-nodeutils');
const path = require('path');
const yaml = require('khala-nodeutils').yaml();
const defaultBinPath = path.resolve(__dirname, '../bin');

const binManagerBashDir = path.resolve(__dirname, '../bin-manage');
const logger = nodeUtils.devLogger('binManager');
exports.configtxlator = async (action = '') => {
	const shellScript = path.resolve(binManagerBashDir, `runConfigtxlator.sh ${action}`);
	logger.info('CMD', shellScript);
	const {stdout} = await exec(shellScript);
	logger.info(stdout);
	return stdout;
};

exports.genBlock = async (configtxYaml, outputFile, profile, channelName = 'testchainid', binPath = defaultBinPath) => {
	const config_dir = path.dirname(configtxYaml);
	process.env.FABRIC_CFG_PATH = config_dir;
	const CMD = `${binPath}/configtxgen -outputBlock ${outputFile} -profile ${profile} -channelID ${channelName}`;
	logger.info('CMD', CMD);
	const result = await exec(CMD);
	logger.debug('CMD:return', result);
};

exports.genChannel = async (configtxYaml, outputFile, profile, channelName, binPath = defaultBinPath) => {
	const config_dir = path.dirname(configtxYaml);

	process.env.FABRIC_CFG_PATH = config_dir;
	const CMD = `${binPath}/configtxgen -outputCreateChannelTx ${outputFile} -profile ${profile} -channelID ${channelName}`;
	logger.info('CMD', CMD);
	const result = await exec(CMD);
	logger.debug('CMD:return', result);

};

exports.genAnchorPeers = async (configtxYaml, outputFile, profile, channelName, asOrg, binPath = defaultBinPath) => {

	const configtxYamlCheck = () => {
		const readResult = yaml.read(configtxYaml);
		const orgs = readResult.Profiles[profile].Application.Organizations;
		if (!Array.isArray(orgs)) {
			throw Error('invalid configYaml:Organizations is not array');
		}
	};
	configtxYamlCheck();
	const config_dir = path.dirname(configtxYaml);
	process.env.FABRIC_CFG_PATH = config_dir;

	const CMD = `${binPath}/configtxgen -outputAnchorPeersUpdate ${outputFile} -profile ${profile} -channelID ${channelName} -asOrg ${asOrg}`;
	logger.info('CMD', CMD);
	const result = await exec(CMD);
	logger.debug('CMD:return', result);
};

//TODO to test
exports.viewBlock = async (blockFile, profile, channelName = 'testchainid', viewOutput = logger, binPath = defaultBinPath) => {
	const CMD = `${binPath}/configtxgen -inspectBlock ${blockFile} -profile ${profile}`;
	logger.info('CMD', CMD);
	const result = await exec(CMD);
	viewOutput.info(result);
};
//TODO to test
exports.viewChannel = async (channelFile, profile, channelName, viewOutput = logger, binPath = defaultBinPath) => {
	const CMD = `${binPath}/configtxgen -inspectChannelCreateTx ${channelFile} -profile ${profile} -channelID ${channelName}`;
	logger.info('CMD', CMD);
	const result = await exec(CMD);
	viewOutput.info(result);
};