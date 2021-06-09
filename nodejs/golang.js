const {execSync} = require('child_process');
/**
 * make sure at least 4G RAM, otherwise "Error: spawn ENOMEM"
 * @returns {string} GOPATH
 */
const getGOPATH = () => {
	return execSync('go env GOPATH', {encoding: 'utf-8'}).trim();
};
const setGOPATH = () => {
	process.env.GOPATH = getGOPATH();
};
module.exports = {
	getGOPATH,
	setGOPATH,
};

