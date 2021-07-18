const {BufferFrom} = require('./protobuf');
const fabproto6 = require('fabric-protos');
const assert = require('assert');
const crypto = require('crypto');
const sha2_256 = (data, encoding = 'hex') => {
	return crypto.createHash('sha256').update(data).digest(encoding);
};
const calculateTransactionId = (signature_header) => {
	const {creator: {mspid, id_bytes}, nonce} = signature_header;
	const creator_bytes = BufferFrom({mspid, id_bytes}, fabproto6.msp.SerializedIdentity);
	const trans_bytes = Buffer.concat([nonce, creator_bytes]);
	return sha2_256(trans_bytes);
};
// utility function to create a random number of
// the specified length.
const getNonce = (length = 24) => {
	assert.ok(Number.isInteger(length), 'Parameter must be an integer');
	return crypto.randomBytes(length);
};
module.exports = {
	sha2_256, calculateTransactionId, getNonce
};
