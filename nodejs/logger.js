const winston = require('winston');
exports.new = (moduleName) => {
	const logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({
				level: 'debug',
				colorize: true,
				label: moduleName
			})
		]
	});
	return logger;
};
exports.setGlobal = () => {
	const hfcLogger = exports.new('hfc');
	global.hfc = {
		logger: hfcLogger
	};
};
