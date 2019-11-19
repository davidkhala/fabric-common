/**
 *
 * @param {Client.Channel} channel
 * @param fcn
 * @param args
 * @param channelId
 * @param chaincodeId
 * @param {MspId} mspId
 * @param {CertificatePem} certificate
 * @return {Promise<{proposal: *, txId: *}>}
 */
exports.generateUnsignedProposal = async (channel, {fcn, args, channelId, chaincodeId}, mspId, certificate) => {
	const transactionProposalReq = {
		fcn,
		args,
		chaincodeId,
		channelId
	};

	const {proposal, txId} = await channel.generateUnsignedProposal(transactionProposalReq, mspId, certificate);
	return {proposal, txId};
};

const {sendPeersProposal} = require('fabric-client/lib/client-utils');
exports.sendSignedProposal = async (endorsePeers, signature, proposal_bytes, timeout) => {
	return await sendPeersProposal(endorsePeers, {signature, proposal_bytes}, timeout);
};