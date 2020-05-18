const {exec} = require('khala-nodeutils/devOps');
const logger = require('khala-logger/log4js').consoleLogger('golang');
/**
 * make sure at least 4G RAM, otherwise "Error: spawn ENOMEM"
 * @returns {Promise<string>} stdout:GOPATH
 */
exports.getGOPATH = async () => {
	const {stdout, stderr} = await exec('go env GOPATH');
	if (stderr) {
		throw Error(stderr);
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
	const cmd = `go get -u -v ${path}`; // FIXME bug design in golang, always use stderr as stdout: https://github.com/golang/go/issues/19939
	const result = await exec(cmd);
	const {stderr} = result;
	logger.debug({cmd}, {stderr});
	return result;
};
