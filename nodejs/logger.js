const Logger = require('khala-nodeutils/logger');
/**
 *
 * @param moduleName
 * @param {boolean} dev true to use `log4j`, false to use `winston`
 * @returns {*}
 */
exports.new = (moduleName, dev) => {
	if (dev) {
		const Log4j = require('log4js');
		const logger = Log4j.getLogger(moduleName);
		logger.level = 'debug';
		return logger;
	}
	return Logger.new(moduleName);
};
exports.setGlobal = (dev) => {
	const hfcLogger = exports.new('hfc', dev);
	global.hfc = {
		logger: hfcLogger
	};
};