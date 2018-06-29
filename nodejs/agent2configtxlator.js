const logger = require('./logger').new('configtxlator agent');
const {RequestPromise} = require('./express/serverClient');

const requestPost = (opt) => {
	return RequestPromise(opt, {
		json: null,
		encoding: null// NOTE config :returning body to be of type Buffer not String
	});
};
exports.encode = {
	configUpdate: (jsonString) =>
		requestPost({
			url: 'http://127.0.0.1:7059/protolator/encode/common.ConfigUpdate',
			body: jsonString
		})
	,
	config: (jsonString) => requestPost(
		{url: 'http://127.0.0.1:7059/protolator/encode/common.Config', body: jsonString})
};
exports.decode = {
	config: (data) => requestPost({url: 'http://127.0.0.1:7059/protolator/decode/common.Config', body: data})
};
exports.compute = {
	updateFromConfigs: async (formData) => {
		const body = await requestPost({
			url: 'http://127.0.0.1:7059/configtxlator/compute/update-from-configs',
			formData
		});
		const bodyString = body.toString();

		const noDiffErr = 'Error computing update: no differences detected between original and updated config';
		if (bodyString.includes(noDiffErr)) {
			logger.warn(bodyString);
			return;
		}
		return body;

	}
};
