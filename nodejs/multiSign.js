const logger = require('./logger').new('multi-signature');
/**
 * @param {Client[]} clients
 * @param proto
 * @returns {{signatures: Array, proto: *}}
 */
exports.signs = (clients, proto) => {
	const signatures = [];
	for (const client of clients) {
		const inlineUser = client._userContext;
		logger.debug('signature identity', inlineUser.getName(), inlineUser._mspId);
		signatures.push(client.signChannelConfig(proto));
	}
	return {signatures, proto};
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