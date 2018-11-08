const {exec} = require('khala-nodeutils/helper');

const Logger = require('khala-nodeutils/logger');
const path = require('path');
const binShellDir = path.resolve(__dirname, '../bin-manage');
exports.configtxlator = async (action = '') => {
	const logger = Logger.new('configtxlator server');
	const shellScript = path.resolve(binShellDir, `runConfigtxlator.sh ${action}`);
	logger.debug(shellScript);
	const {stdout} = await exec(shellScript);
	logger.info(stdout);
	return stdout;
};

exports.genAnchorPeers = async (configtxYaml, channelName, orgName, anchorTxOutputFile) => {
	const config_dir = path.dirname(configtxYaml);
	const runConfigtxGenShell = path.resolve(binShellDir, 'runConfigtxgen.sh');
	const PROFILE = 'anchorPeers';
	await exec(`export FABRIC_CFG_PATH=${config_dir} && ${runConfigtxGenShell} genAnchorPeers ${anchorTxOutputFile} ${PROFILE} ${channelName} ${orgName}`);
};