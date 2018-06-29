const util = require('util');
const exec = util.promisify(require('child_process').exec);
const logger = require('./logger').new('golang');
exports.getGOPATH = async () => {
	const {stdout, stderr} = await exec('go env GOPATH');
	if (stderr) {
		throw stderr;
	}
	return stdout.trim();
};
exports.setGOPATH = async () => {
	process.env.GOPATH = await exports.getGOPATH();
};
/**
 * go get -u -v ${path}
 * @returns {Promise<void>}
 */
exports.get = async (path) => {
	const cmd = `go get -u -v ${path}`; //FIXME bug design in golang, always use stderr as stdout: https://github.com/golang/go/issues/19939
	const result = await exec(cmd);
	const {stderr} = result;
	logger.debug({cmd}, {stderr});
	return result;
};