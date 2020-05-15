const {axiosPromise} = require('khala-axios');
const {EncodeType, DecodeType} = require('khala-fabric-formatter/configtxlator');
const FormData = require('form-data');
const requestPost = async (opt) => {
	try {
		return await axiosPromise(opt, {
			json: null,
			encoding: null, // NOTE config :returning body to be of type Buffer not String
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
	 * @param {EncodeType} type
	 * @param jsonString
	 */
	async encode(type, jsonString) {
		const baseUrl = `${this.baseUrl}/protolator/encode`;
		const body = jsonString;
		return requestPost({
			url: `${baseUrl}/${type}`, body
		});
	}

	/**
	 *
	 * @param {DecodeType} type
	 * @param {Buffer} data
	 */
	async decode(type, data) {
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
		// TODO formData.getHeaders is not a function
		const {proto: originalConfigProto} = originalConfig;
		const {json: originalConfigJSON} = originalConfig;
		const {proto: updatedConfigProto} = updateConfig;
		const {json: updatedConfigJSON} = updateConfig;


		let originalConfigBuff, updatedConfigBuff;
		if (!originalConfigProto) {
			const originalConfigResult = await this.encode(EncodeType.Config, originalConfigJSON);
			originalConfigBuff = Buffer.from(originalConfigResult);
		} else {
			originalConfigBuff = originalConfigProto.toBuffer();
		}

		if (!updatedConfigProto) {
			const updatedConfigResult = await this.encode(EncodeType.Config, updatedConfigJSON);
			updatedConfigBuff = Buffer.from(updatedConfigResult);
		} else {
			updatedConfigBuff = updatedConfigProto.toBuffer();
		}


		const formData = new FormData();
		// FIXME
		formData.append('channel', channelName);
		formData.append('original', originalConfigBuff, 'original.proto');
		formData.append('updated', updatedConfigBuff, 'updated.proto');

		const modified_config_proto = await this.compute(formData).updateFromConfigs();
		return modified_config_proto;
	}
}


module.exports = ConfigtxlatorServer;

