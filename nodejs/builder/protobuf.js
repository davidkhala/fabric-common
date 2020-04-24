const {load} = require('fabric-client/lib/ProtoLoader');
const path = require('path');
const fs = require('fs');

class Protobuf {
	/**
	 *
	 * @param [node_modules]
	 * @param [protoRoot]
	 */
	constructor(node_modules, protoRoot) {
		const root = protoRoot ? path.resolve(protoRoot) : path.resolve(node_modules, 'fabric-client', 'lib', 'protos');
		if (!fs.lstatSync(root).isDirectory()) {
			throw Error(`ProtobufLoader: root <${root}> is not a directory`);
		}
		this.root = root;
	}

	require(...protoRelativePath) {
		const protobufFile = path.resolve(this.root, ...protoRelativePath);
		const result = load(protobufFile);
		if (!result) {
			throw Error(`ProtobufLoader: invalid protobuf file in <${protobufFile}>`);
		}
		return result;
	}

}

module.exports = Protobuf;
