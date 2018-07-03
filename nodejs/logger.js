const winston = require('winston');
exports.new = (moduleName) => {
	return new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({
				level: 'debug',
				colorize: true,
				label: moduleName
			})
		]
	});
};
exports.setGlobal = () => {
	const hfcLogger = exports.new('hfc');
	global.hfc = {
		logger: hfcLogger
	};
};
