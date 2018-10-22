const winston = require('winston');
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
	return new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({
				level: 'debug',
				colorize: true,
				label: moduleName,
				timestamp: true,
			})
		]
	});
};
exports.newFile = (moduleName, logFile) => {
	return new (winston.Logger)({
		transports: [
			new (winston.transports.File)({
				//property name: https://github.com/winstonjs/winston/tree/2.x#multiple-transports-of-the-same-type
				level: 'debug',
				label: moduleName,
				filename: logFile,
				timestamp: true,
				json: false,
				colorize: false
			})
		]
	});
};
exports.setGlobal = (dev) => {
	const hfcLogger = exports.new('hfc', dev);
	global.hfc = {
		logger: hfcLogger
	};
};