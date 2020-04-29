const moduleName = 'configtxlator agent';
const {axiosPromise} = require('khala-axios');

const requestPost = async (opt) => {
	try {
		return await axiosPromise(opt, {
			json: null,
			encoding: null// NOTE config :returning body to be of type Buffer not String
		});
	} catch (e) {
		if (e.statusCode && e.statusMessage && e.body) {
			const {statusCode, statusMessage, body} = e;
			throw Error(`${moduleName}: ${statusCode} ${statusMessage}: ${body}`);
		} else {
			throw e;
		}
	}

};
exports.encode = {
	configUpdate: async (jsonString) =>
		await requestPost({
			url: 'http://127.0.0.1:7059/protolator/encode/common.ConfigUpdate',
			body: jsonString
		}),
	config: async (jsonString) => await requestPost(
		{url: 'http://127.0.0.1:7059/protolator/encode/common.Config', body: jsonString})
};
exports.decode = {
	config: async (data) => await requestPost({url: 'http://127.0.0.1:7059/protolator/decode/common.Config', body: data})
};
exports.compute = {
	updateFromConfigs: async (formData) => await requestPost({
		url: 'http://127.0.0.1:7059/configtxlator/compute/update-from-configs',
		formData
	})
};
