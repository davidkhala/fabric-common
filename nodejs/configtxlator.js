const {axiosPromise} = require('khala-axios');
const {EncodeType, DecodeType} = require('khala-fabric-formatter/configtxlator');
const requestPost = async (opt) => {
	try {
		return await axiosPromise(opt, {
			json: null,
			encoding: null// NOTE config :returning body to be of type Buffer not String
		});
	} catch (e) {
		if (e.statusCode && e.statusMessage && e.body) {
			const {statusCode, statusMessage, body} = e;
			throw Error(`configtxlator server: ${statusCode} ${statusMessage}: ${body}`);
		} else {
			throw e;
		}
	}

};

class ConfigtxlatorServer {
	constructor({protocol, host, port} = {}) {
		if (!protocol) {
			protocol = 'http';
		}
		if (!host) {
			host = 'localhost';
		}
		if (!port) {
			port = 7059;
		}
		this.baseUrl = `${protocol}://${host}:${port}`;
	}

	/**
	 * TODO work as Buffer.from to 'binary'?
	 * @param jsonString
	 * @param {EncodeType} type
	 */
	async encode(jsonString, type) {
		const baseUrl = `${this.baseUrl}/protolator/encode`;
		const body = jsonString;
		return requestPost({
			url: `${baseUrl}/${type}`, body
		});

	}

	/**
	 *
	 * @param {Buffer} data
	 * @param {DecodeType} type
	 */
	async decode(data, type) {
		const body = data;
		return requestPost({url: `${this.baseUrl}/protolator/decode/${type}`, body});
	}

	compute(formData) {
		return {
			updateFromConfigs: async () => requestPost({
				url: `${this.baseUrl}/configtxlator/compute/update-from-configs`, formData
			})
		};
	}

	async computeUpdate(channelName, originalConfig, updateConfig) {
		let {proto: originalConfigProto} = originalConfig;
		const {json: originalConfigJSON} = originalConfig;
		let {proto: updatedConfigProto} = updateConfig;
		const {json: updatedConfigJSON} = updateConfig;

		if (!updatedConfigProto) {
			updatedConfigProto = await this.encode(updatedConfigJSON, EncodeType.Config);
		}

		if (!originalConfigProto) {
			originalConfigProto = await this.encode(originalConfigJSON, EncodeType.Config);
		}
		const formData = {
			channel: channelName,
			original: {
				value: originalConfigProto,
				options: {
					filename: 'original.proto',
					contentType: 'application/octet-stream'
				}
			},
			updated: {
				value: updatedConfigProto,
				options: {
					filename: 'updated.proto',
					contentType: 'application/octet-stream'
				}
			}
		};
		const modified_config_proto = await this.compute(formData).updateFromConfigs();
		return Buffer.from(modified_config_proto, 'binary'); //TODO is it what encode.configUpdate do?
	}
}


module.exports = ConfigtxlatorServer;

