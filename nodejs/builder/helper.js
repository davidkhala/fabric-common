const crypto = require('crypto');
exports.sha2_256 = (data, encoding = 'hex') => {
	return crypto.createHash('sha256').update(data).digest(encoding);
};
const FabricUtils = require('fabric-client/lib/utils');

exports.FabricConfig = {
	set: (name, value) => {
		FabricUtils.setConfigSetting(name, value);
	},
	get: (name, defaultValue) => {
		return FabricUtils.getConfigSetting(name, defaultValue);
	}

};
