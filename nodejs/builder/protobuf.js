const {load} = require('fabric-client/lib/ProtoLoader');
const path = require('path');

class Protobuf {
	constructor(node_modules) {
		this.root = path.resolve(node_modules, 'fabric-client', 'lib', 'protos');
	}

	require(protoRelativePath) {
		return load(path.resolve(this.root, protoRelativePath));
	}

}

module.exports = Protobuf;
