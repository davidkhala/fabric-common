/**
 * @typedef {string} ClientKey The private key file, in PEM format
 *    To use with the gRPC protocol (that is, with TransportCredentials).
 *    Required when using the grpcs protocol with client certificates.
 */

/**
 * @typedef {string} ClientCert The public certificate file, in PEM format,
 *    To use with the gRPC protocol (that is, with TransportCredentials).
 *    Required when using the grpcs protocol with client certificates.
 */

/**
 * @typedef {string} SSLTargetNameOverride Used in test environment only
 *  when the server certificate's hostname (in the 'CN' field) does not match the actual host endpoint that the server process runs at,
 *  the application can work around the client TLS verify failure by setting this property to the value of the server certificate's hostname
 */


/**
 *
 * @param opts
 * @param [logger]
 */
const RemoteOptsTransform = (opts = {}, logger = console) => {
	const {sslTargetNameOverride, host} = opts;
	if (host && host.toLowerCase() !== host) {
		logger.error(`invalid hostname [${host}] : [docker-network][gRPCs] host endpoint contains upper case is not allowed in TLS auth within docker network`);
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
 * @enum {string}
 */
const LoggingLevel = {
	fatal: 'FATAL', FATAL: 'FATAL',
	panic: 'PANIC', PANIC: 'PANIC',
	error: 'ERROR', ERROR: 'ERROR',
	warning: 'WARNING', WARNING: 'WARNING',
	info: 'INFO', INFO: 'INFO',
	debug: 'DEBUG', DEBUG: 'DEBUG',
	undefined: 'INFO', null: 'INFO'
};
exports.LoggingLevel = LoggingLevel;