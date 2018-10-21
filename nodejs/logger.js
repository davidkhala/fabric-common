const winston = require('winston');
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
exports.setGlobal = (dev) => {
	const hfcLogger = exports.new('hfc', dev);
	global.hfc = {
		logger: hfcLogger
	};
};