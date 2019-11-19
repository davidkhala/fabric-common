const {sendPeersProposal, toEnvelope} = require('fabric-client/lib/client-utils');
const {emptyChannel} = require('./channel');

/**
 * @typedef PeerSignedProposal
 * @property {Buffer} proposal_bytes
 * @property {Buffer} signature
 */

/**
 *
 * @param {Client.Peer[]} endorsePeers
 * @param {PeerSignedProposal} signedProposal
 * @param [timeout]
 * @return {Promise<ProposalResponse[]>} proposalResponses
 */
exports.sendSignedProposal = async (endorsePeers, signedProposal, timeout) => sendPeersProposal(endorsePeers, signedProposal, timeout);


/**
 * @typedef {Object} SignedCommit
 * @property {TransactionRequest} request
 * @property {} signedTransaction
		signedTransaction: Buffer;
		orderer?: Orderer | string;
 */

/**
 * send the signed commit proposal for a transaction
 *
 * @param {SignedCommitProposal} request the signed commit proposal
 * @param {number} timeout the timeout setting passed on sendSignedProposal
 */
exports.sendSignedTransaction = async (request, timeout) => {
	const {signedTransaction} = request;
	const signed_envelope = toEnvelope(signedTransaction);

	// verify that we have an orderer configured
	const orderer = this._clientContext.getTargetOrderer(request.orderer, this.getOrderers(), this._name);
	return orderer.sendBroadcast(signed_envelope, timeout);
};


/**
 * @param channelName
 * @param [fcn]
 * @param [args]
 * @param chaincodeId
 * @param {Client.TransientMap} [transientMap] raw type
 * @param {MspId} mspId
 * @param {CertificatePem} certificate
 * @return {{proposal: Proposal, txId: *}}
 */
exports.unsignedTransactionProposal = (channelName, {fcn, args = [], chaincodeId, transientMap}, mspId, certificate) => {
	/**
	 * @type {ProposalRequest}
	 */
	const transactionProposalReq = {
		fcn,
		args,
		chaincodeId,
		transientMap
	};
	const channel = emptyChannel(channelName);


	const {proposal, txId} = channel.generateUnsignedProposal(transactionProposalReq, mspId, certificate, false);
	return {proposal, txId};
};

/**
 * @typedef {Object} UnsignedTransaction
 * @property {Client.Header} header
 * @property {ByteBuffer} data
 */

/**
 *
 * @param channelName
 * @param proposalResponses
 * @param proposal
 * @return {UnsignedTransaction}
 */
exports.unsignedTransaction = (channelName, proposalResponses, proposal) => {
	const channel = emptyChannel(channelName);

	/**
	 * @type {TransactionRequest}
	 */
	const request = {
		proposalResponses, proposal
	};
	return channel.generateUnsignedTransaction(request);
};
// TODO commit transaction