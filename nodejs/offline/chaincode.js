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
 * @property {Buffer} signedTransaction
 */

/**
 * send the signed commit proposal for a transaction
 *
 * @param {PeerSignedProposal} signedTransaction
 * @param {Client.Orderer} orderer
 */
exports.sendSignedTransaction = async (signedTransaction, orderer) => {
	const signed_envelope = toEnvelope(signedTransaction);
	return await orderer.sendBroadcast(signed_envelope);
};


/**
 * @param {string} channelName
 * @param {string} [fcn]
 * @param {string[]} [args]
 * @param {string} chaincodeId
 * @param {Client.TransientMap} [transientMap] raw type
 * @param {MspId} mspId
 * @param {CertificatePem} certificate
 * @return {{proposal: Proposal, txId: TransactionId}}
 */
exports.unsignedTransactionProposal = (channelName, {fcn, args = [], chaincodeId, transientMap}, mspId, certificate) => {
	/**
	 * @type {ProposalRequest}
	 */
	const transactionProposalReq = {
		fcn,
		args,
		chaincodeId,
		transientMap,
		argbytes: undefined
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
 * @param {string} channelName
 * @param {ProposalResponse[]} proposalResponses
 * @param {Proposal} proposal
 * @return {UnsignedTransaction}
 */
exports.unsignedTransaction = (channelName, proposalResponses, proposal) => {
	const channel = emptyChannel(channelName);

	/**
	 * @type {TransactionRequest}
	 */
	const request = {
		proposalResponses, proposal,
		orderer: undefined, txID: undefined
	};
	return channel.generateUnsignedTransaction(request);
};
