const logger = require('./logger').new('remote');
const RemoteOptsTransform = (opts = {}) => {
	const {sslTargetNameOverride, host} = opts;
	if (host && host.toLowerCase() !== host) {
		logger.error(`invalid hostname [${host}] : [docker-network][gRpcs] host endpoint contains upper case is not allowed in TLS auth within docker network`);
	}
	if (sslTargetNameOverride) {
		opts['ssl-target-name-override'] = sslTargetNameOverride;
		logger.warn(`[ssl-target-name-override]=${sslTargetNameOverride} used for test environment only when the server certificate's hostname ('CN') does not match the actual host endpoint`);
		delete opts.sslTargetNameOverride;
		delete opts.clientKey;
		delete opts.clientCert;
	}
	for (const [key, value] of Object.entries(opts)) {
		if (!value) {
			delete opts[key];
		}
	}
	return opts;
};
exports.RemoteOptsTransform = RemoteOptsTransform;

/**
 * Valid logging levels are case-insensitive string
 * @type {string[]}
 */
exports.loggingLevels = ['FATAL', 'PANIC', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];