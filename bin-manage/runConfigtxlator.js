//TODO where does it belong
const {exec} = require('../nodejs/helper');
const logger = require('../nodejs/logger').new('configtxlator server');
const path = require('path');

exports.run = async (action = '') => {
	const shellScript = path.resolve(__dirname, `runConfigtxlator.sh ${action}`);
	logger.debug(shellScript);
	const {stdout} = await exec(shellScript);
	logger.info(stdout);
	return stdout;
};
