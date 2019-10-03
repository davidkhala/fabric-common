const logger = require('./logger').new('multi-signature');
/**
 * @param {Client[]} clients
 * @param proto
 * @returns {Client.ConfigSignature[]} signatures
 */
exports.signs = (clients, proto) => {
	const signatures = [];
	for (const client of clients) {
		logger.debug('signature identity', client._userContext.getName(), client._userContext._mspId);
		signatures.push(client.signChannelConfig(proto));
	}
	return signatures;
};
exports.toBase64 = (signatures) => {
	return signatures.map(({signature_header, signature}) => {
		return {
			signature_header: signature_header.toBase64(),
			signature: signature.toBase64()
		};
	});
};
exports.fromBase64 = (signatures) => {
	const ByteBuffer = require('bytebuffer');

	return signatures.map(({signature_header, signature}) => {
		return {
			signature_header: ByteBuffer.fromBase64(signature_header),
			signature: ByteBuffer.fromBase64(signature)
		};
	});
};