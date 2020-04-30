/**
 *
 * @param {string} moduleName
 * @param {boolean} [dev] true to include debug level
 * @returns {*}
 */
exports.new = (moduleName, dev) => {
	const Log4js = require('khala-logger/log4js');
	return Log4js.consoleLogger(moduleName, dev ? 5 : 4);
};
exports.setGlobal = (logger) => {
	global.hfc = {
		logger
	};
};
