const assert = require('assert');
const fabprotos = require('fabric-protos');
const commonProto = fabprotos.common;
const {BlockMetadataIndex: {SIGNATURES, TRANSACTIONS_FILTER, LAST_CONFIG, ORDERER, COMMIT_HASH}} = require('./constants');

const block = {
	header: ({header}) => {
		const {number, previous_hash, data_hash} = header;

		return {
			number: number.toInt(),
			previous_hash: previous_hash.toString('hex'),
			data_hash: data_hash.toString('hex')
		};
	},
	data: ({data: {data}}) => {
		return data;
	},
	metadata: ({metadata: {metadata}}) => {
		assert.strictEqual(metadata.length, 5);
		const {value, signatures} = metadata[SIGNATURES];

		for (const {signature_header, signature} of signatures) {
			console.debug({signature_header, signature});
		}
		metadata[SIGNATURES] = {value: {index: commonProto.LastConfig.decode(value).index.toInt()}, signatures};
		const [flag] = metadata[TRANSACTIONS_FILTER];
		const buf = metadata[COMMIT_HASH];

		const {value: _value, signatures: _signatures} = commonProto.Metadata.decode(buf);
		assert.ok(Array.isArray(_signatures) && _signatures.length === 0);
		metadata[COMMIT_HASH] = {commitHash: _value};

		assert.deepStrictEqual(metadata[LAST_CONFIG], {});
		assert.deepStrictEqual(metadata[ORDERER], {});
		assert.strictEqual(flag, 0);
		return metadata;
	},
};
module.exports = block;