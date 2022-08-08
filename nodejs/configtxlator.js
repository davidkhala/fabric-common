import {axiosPromise} from '@davidkhala/axios/index.js';
import FormData from 'form-data';

const requestPost = async (opt, otherOptions) => {

	return await axiosPromise(opt, otherOptions);
	//	TODO list out common error case

};

export default class ConfigtxlatorServer {
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
	 * @param {ConfigtxlatorType} type
	 * @param jsonString
	 */
	async encode(type, jsonString) {
		const baseUrl = `${this.baseUrl}/protolator/encode`;
		const body = jsonString;
		return requestPost({
			url: `${baseUrl}/${type}`, body
		}, {
			responseType: 'arraybuffer'
		});
	}

	/**
	 *
	 * @param {ConfigtxlatorType} type
	 * @param {Buffer} data
	 */
	async decode(type, data) {
		const body = data;
		return requestPost({url: `${this.baseUrl}/protolator/decode/${type}`, body});
	}

	async computeUpdate(channelName, originalConfigProtoBuff, updatedConfigProtoBuff) {
		const formData = new FormData();
		formData.append('channel', channelName);
		formData.append('updated', updatedConfigProtoBuff, {
			filename: 'updated.proto', contentType: 'application/octet-stream'
		});


		formData.append('original', originalConfigProtoBuff, {
			filename: 'original.proto', contentType: 'application/octet-stream'
		});


		return await requestPost({
			url: `${this.baseUrl}/configtxlator/compute/update-from-configs`, formData
		}, {responseType: 'arraybuffer'});

	}
}
