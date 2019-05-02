exports.sha2_256 = require('fabric-client/lib/hash').SHA2_256;
exports.nodeUtil = require('khala-nodeutils');

const FabricUtils = require('fabric-client/lib/utils');
exports.dockerode = require('khala-dockerode');
exports.FabricConfig = {
	set: (name, value) => {
		FabricUtils.setConfigSetting(name, value);
	},
	get: (name, defaultValue) => {
		return FabricUtils.getConfigSetting(name, defaultValue);
	}

};
