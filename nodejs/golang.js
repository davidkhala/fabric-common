const {exec} = require('khala-nodeutils/devOps');
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

