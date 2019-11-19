const {RequestPromise} = require('khala-nodeutils/request');
const {LoggingLevel} = require('./remote');
/**
 * @typedef {Object} OperationHealthz
 * @property {string} status
 * @property {string} time
 */

/**
 * @typedef {Object} OperationVersion
 * @property {string} CommitSHA '7917a40'
 * @property {string} Version
 */
/**
 * @typedef {Object} OperationLogSpec
 * @property {string} spec
 */

/**
 * /healthz official health check, for peer and orderer
 * @param {string} baseUrl ${domain}:${port} port is usually 9443(for peer), 8443(for orderer)
 * @param {RequestExtraOptions} [otherOptions]
 * @returns {Promise<OperationHealthz>}
 */
exports.health = async (baseUrl, otherOptions) => {
	const url = `${baseUrl}/healthz`;
	const result = await RequestPromise({url, method: 'GET'}, otherOptions);
	if (result.status === 'OK') {
		return result;
	} else {
		const err = Error('healthz check');
		err.url = url;
		Object.assign(err, result);
		throw err;
	}
};

/**
 *
 * @param {string} baseUrl
 * @param {RequestExtraOptions} [otherOptions]
 * @return {Promise<string>} spec
 */
exports.getLogLevel = async (baseUrl, otherOptions) => {
	const url = `${baseUrl}/logspec`;
	/**
	 * @type OperationLogSpec
	 */
	const result = await RequestPromise({url, method: 'GET'}, otherOptions);
	return result.spec;
};
/**
 * log level validation will be completed by service
 * @param {string} baseUrl
 * @param {LoggingLevel} level
 * @param {RequestExtraOptions} [otherOptions]
 */
exports.setLogLevel = async (baseUrl, level, otherOptions) => {
	const url = `${baseUrl}/logspec`;
	await RequestPromise({url, method: 'PUT', body: {spec: LoggingLevel[level]}}, otherOptions); // body is undefined
};