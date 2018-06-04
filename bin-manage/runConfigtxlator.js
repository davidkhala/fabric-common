const util = require('util');
const exec = util.promisify(require('child_process').exec);
const logger = require('../nodejs/logger').new('configtxlator server');
const path = require('path');

const run = async () => {
	const shellScript=path.resolve(__dirname,'runConfigtxlator.sh');
	const std = await exec(shellScript);
	logger.info(std.stdout);
};
run();
