const RemoteOptsTransform = (opts = {}) => {
	const {sslTargetNameOverride} = opts;
	if (sslTargetNameOverride) {
		opts['ssl-target-name-override'] = sslTargetNameOverride;
		delete opts.sslTargetNameOverride;
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