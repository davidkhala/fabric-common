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

// TODO
// static async generateBlockHash(block) {
// 	const headerAsn = asn.define('headerAsn', function () {
// 		this.seq().obj(
// 			this.key('Number').int(),
// 			this.key('PreviousHash').octstr(),
// 			this.key('DataHash').octstr()
// 		);
// 	});
// 	const output = headerAsn.encode(
// 		{
// 			Number: parseInt(block.header.number),
// 			PreviousHash: Buffer.from(block.header.previous_hash, 'hex'),
// 			DataHash: Buffer.from(block.header.data_hash, 'hex')
// 		},
// 		'der'
// 	);
// 	return sha.sha256(output);
// }
