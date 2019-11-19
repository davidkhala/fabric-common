const {sendPeersProposal} = require('fabric-client/lib/client-utils');
const {emptyChannel} = require('./channel');

exports.sendSignedProposal = async (endorsePeers, signature, proposal_bytes, timeout) => {
	return await sendPeersProposal(endorsePeers, {signature, proposal_bytes}, timeout);
};

/**
 * @param channelName
 * @param [fcn]
 * @param [args]
 * @param chaincodeId
 * @param {Client.TransientMap} [transientMap] raw type
 * @param {MspId} mspId
 * @param {CertificatePem} certificate
 * @return {Promise<{proposal: Proposal, txId: *}>}
 */
exports.unsignedTransactionProposal = async (channelName, {fcn, args = [], chaincodeId, transientMap}, mspId, certificate) => {
	/**
	 *
	 * @type {ProposalRequest}
	 */
	const transactionProposalReq = {
		fcn,
		args,
		chaincodeId,
		transientMap
	};
	const channel = emptyChannel(channelName);


	const {proposal, txId} = await channel.generateUnsignedProposal(transactionProposalReq, mspId, certificate, false);
	return {proposal, txId};
};
// TODO commit transaction