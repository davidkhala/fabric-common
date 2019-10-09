const {logger: Logger, devLogger: DevLogger} = require('khala-nodeutils');
/**
 *
 * @param moduleName
 * @param {boolean} [dev] true to use `log4j`, false to use `winston`
 * @returns {*}
 */
exports.new = (moduleName, dev) => {
	if (dev) {
		return DevLogger(moduleName);
	}
	return Logger.new(moduleName);
};
exports.setGlobal = (dev) => {
	const hfcLogger = exports.new('fabric-sdk-node', dev);
	global.hfc = {
		logger: hfcLogger
	};
};
