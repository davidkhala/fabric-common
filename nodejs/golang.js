const {execSync} = require('child_process');
/**
 * make sure at least 4G RAM, otherwise "Error: spawn ENOMEM"
 * @returns {Promise<string>} stdout:GOPATH
 */
exports.getGOPATH = () => {
	return execSync('go env GOPATH', {encoding: 'utf-8'});
};
exports.setGOPATH = async () => {
	process.env.GOPATH = await exports.getGOPATH();
};

