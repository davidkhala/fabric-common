exports.sha2_256 = require('fabric-common/lib/HashPrimitives').SHA2_256;

const FabricUtils = require('fabric-common/lib/Utils');

exports.FabricConfig = {
	set: (name, value) => {
		FabricUtils.setConfigSetting(name, value);
	},
	get: (name, defaultValue) => {
		return FabricUtils.getConfigSetting(name, defaultValue);
	}

};
