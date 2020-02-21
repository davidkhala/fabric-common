exports.sha2_256 = require('fabric-client/lib/hash').SHA2_256;

const FabricUtils = require('fabric-client/lib/utils');

exports.FabricConfig = {
	set: (name, value) => {
		FabricUtils.setConfigSetting(name, value);
	},
	get: (name, defaultValue) => {
		return FabricUtils.getConfigSetting(name, defaultValue);
	}

};
