const util = require('util');
const exec = util.promisify(require('child_process').exec);
const logger = require('../nodejs/logger').new('configtxlator server');
const path = require('path');

exports.run = async (action = '') => {
	const shellScript = path.resolve(__dirname, `runConfigtxlator.sh ${action}`);
	logger.debug(shellScript);
	const {stdout} = await exec(shellScript);
	logger.info(stdout);
	return stdout;
};
