const {exec} = require('khala-nodeutils/helper');

const Logger = require('khala-nodeutils/logger');
const path = require('path');
const yaml = require('khala-nodeutils/yaml');
const binShellDir = path.resolve(__dirname, '../bin-manage');
const runConfigtxGenShell = path.resolve(binShellDir, 'runConfigtxgen.sh');

exports.configtxlator = async (action = '') => {
	const logger = Logger.new('configtxlator server');
	const shellScript = path.resolve(binShellDir, `runConfigtxlator.sh ${action}`);
	logger.debug(shellScript);
	const {stdout} = await exec(shellScript);
	logger.info(stdout);
	return stdout;
};

exports.genAnchorPeers = async (configtxYaml, channelName, orgName, anchorTxOutputFile, PROFILE = 'anchorPeers') => {

	const configtxYamlCheck = () => {
		const readResult = yaml.read(configtxYaml);
		const orgs = readResult.Profiles[PROFILE].Application.Organizations;
		if (!Array.isArray(orgs)) {
			throw Error('invalid configYaml:Organizations is not array');
		}
	};
	configtxYamlCheck();
	const config_dir = path.dirname(configtxYaml);
	await exec(`export FABRIC_CFG_PATH=${config_dir} && ${runConfigtxGenShell} genAnchorPeers ${anchorTxOutputFile} ${PROFILE} ${channelName} ${orgName}`);
};

exports.genChannel = async (configtxYaml, channelName, channelOutputFile, PROFILE = channelName) => {
	const config_dir = path.dirname(configtxYaml);

	await exec(`export FABRIC_CFG_PATH=${config_dir} && ${runConfigtxGenShell} genChannel ${channelOutputFile} ${PROFILE} ${channelName}`);
};

exports.genBlock = async (configtxYaml, blockOutputFile, PROFILE) => {
	const config_dir = path.dirname(configtxYaml);
	await exec(`export FABRIC_CFG_PATH=${config_dir} && ${runConfigtxGenShell} genBlock ${blockOutputFile} ${PROFILE}`);
};