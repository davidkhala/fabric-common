const {axiosPromise} = require('khala-axios');
const {LoggingLevel} = require('khala-fabric-formatter/remote');
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

class OperationService {
	/**
	 *
	 * @param baseUrl ${domain}:${port} port is usually 9443(for peer), 8443(for orderer)
	 * @param {RequestExtraOptions} [otherOptions]
	 */
	constructor(baseUrl, otherOptions) {
		this.url = baseUrl;
		this.options = otherOptions;
	}

	/**
	 * /healthz health check, for peer and orderer
	 * @returns {Promise<OperationHealthz>}
	 */
	async health() {
		const url = `${this.url}/healthz`;
		const result = await axiosPromise({url, method: 'GET'}, this.options);
		if (result.status === 'OK') {
			return result;
		} else {
			const err = Error('healthz check');
			err.url = url;
			Object.assign(err, result);
			throw err;
		}
	}

	/**
	 *
	 * @return {Promise<OperationVersion>}
	 */
	async version() {
		const url = `${this.url}/version`;
		return await axiosPromise({url, method: 'GET'}, this.options);
	}

	/**
	 *
	 * @return {Promise<string>} spec
	 */
	async getLogLevel() {
		const url = `${this.url}/logspec`;
		/**
		 * @type OperationLogSpec
		 */
		const result = await axiosPromise({url, method: 'GET'}, this.options);
		return result.spec;
	}

	/**
	 * log level validation will be done by service
	 * @param {LoggingLevel} level
	 */
	async setLogLevel(level) {
		const url = `${this.url}/logspec`;
		await axiosPromise({url, method: 'PUT', body: {spec: LoggingLevel[level]}}, this.options); // response is undefined
	}
}

module.exports = OperationService;

