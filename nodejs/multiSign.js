const logger = require('./logger').new('multi-signature');
exports.signs = async (clientSwitchPromises, proto) => {
	const signatures = [];
	for (const promise of clientSwitchPromises) {
		const client = await promise;
		const inlineUser = client.getUserContext();
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