const logger = require('./logger').new('multi-signature');
/**
 * @param {Client[]} clients
 * @param proto
 * @returns {{signatures: Array, proto: *}}
 */
exports.signs = (clients, proto) => {
	const signatures = [];
	for (const client of clients) {
		logger.debug('signature identity', client._userContext.getName(), client._userContext._mspId);
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
// TODO @deprecated
const client_utils = require('fabric-client/lib/client-utils');
const Channel = require('fabric-client/lib/Channel');
exports.sendTransactionProposal = async (request, channelId, client_context, timeout) => {
	const errorMsg = client_utils.checkProposalRequest(request, true);

	if (errorMsg) {
		throw new Error(errorMsg);
	}
	if (!request.args) {
		// args is not optional because we need for transaction to execute
		throw new Error('Missing "args" in Transaction proposal request');
	}

	if (!request.targets || request.targets.length < 1) {
		throw new Error('Missing peer objects in Transaction proposal');
	}

	const proposal = Channel._buildSignedProposal(request, channelId, client_context);

	const responses = await client_utils.sendPeersProposal(request.targets, proposal.signed, timeout);
	return [responses, proposal.source];
};