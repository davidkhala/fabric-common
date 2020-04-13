/**
 * @typedef PeerSignedProposal
 * @property {Buffer} proposal_bytes
 * @property {Buffer} signature
 */
/**
 * @typedef {Object} UnsignedTransaction
 * @property {Client.Header} header
 * @property {ByteBuffer} data
 */

const Channel = require('fabric-client/lib/Channel');
const {sendPeersProposal, toEnvelope} = require('fabric-client/lib/client-utils');
const {emptyChannel} = require('./channel');

/**
 *
 * @param {Client.Peer[]} endorsePeers
 * @param {PeerSignedProposal} signedProposal
 * @param [timeout]
 * @return {Promise<ProposalResponse[]>} proposalResponses
 */
exports.sendSignedProposal = async (endorsePeers, signedProposal, timeout) => sendPeersProposal(endorsePeers, signedProposal, timeout);

/**
 * send the signed commit proposal for a transaction
 * @param {PeerSignedProposal} signedTransaction
 * @param {Client.Orderer} orderer
 * @param {number} [timeout]
 * @return {Promise<Client.BroadcastResponse>}
 */
exports.sendSignedTransaction = async (signedTransaction, orderer, timeout) => {
	const signed_envelope = toEnvelope(signedTransaction);
	return await orderer.sendBroadcast(signed_envelope, timeout);
};


/**
 * @param {string} channelName
 * @param {string} [fcn]
 * @param {string[]} [args]
 * @param {string} chaincodeId
 * @param {Client.TransientMap} [transientMap] raw type
 * @param {MspId} mspId
 * @param {CertificatePem} certificate
 * @return {{proposal: Proposal, transactionID: string}}
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
	const transactionID = txId.getTransactionID();
	return {proposal, transactionID};
};



/**
 *
 * @param {ProposalResponse[]} proposalResponses
 * @param {Proposal} proposal
 * @return {UnsignedTransaction}
 */
exports.unsignedTransaction = (proposalResponses, proposal) => {
	const channel = emptyChannel('void');

	proposal = Object.assign({getHeader: () => proposal.header}, proposal);
	/**
	 * @type {TransactionRequest}
	 */
	const request = {
		proposalResponses, proposal,
		orderer: undefined, txID: undefined
	};
	return channel.generateUnsignedTransaction(request);
};
/**
 * NOTE transaction proposal cannot be performed on peer without chaincode installed
 * Error: cannot retrieve package for chaincode adminChaincode/v0,
 *        error open /var/hyperledger/production/chaincodes/adminChaincode.v0: no such file or directory
 *
 * This is also used as query
 * @param {Client} client
 * @param {Client.Peer[]} targets
 * @param {string} channelName
 * @param {string} chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {Client.TransientMap} [transientMap]
 * @param {number} proposalTimeout
 * @return {Promise<Client.TransactionRequest>}
 */
exports.transactionProposal = async (client, targets, channelName, {
	chaincodeId, fcn, args, transientMap
}, proposalTimeout) => {
	const txId = client.newTransactionID();
	const request = {
		chaincodeId,
		fcn,
		args,
		txId,
		targets,
		transientMap
	};
	const [proposalResponses, proposal] = await Channel.sendTransactionProposal(request, channelName, client, proposalTimeout);
	return {
		proposalResponses,
		proposal,
		txId
	};
};

/**
 *
 * @param {SigningIdentity} signingIdentity
 * @param {Client.TransactionRequest} nextRequest
 * @param {Client.Orderer} orderer
 * @param {number} [timeout]
 * @return {Promise<Client.BroadcastResponse>}
 */
exports.commit = async (signingIdentity, nextRequest, orderer, timeout) => {
	const {proposalResponses, proposal} = nextRequest;
	const unsignedTx = exports.unsignedTransaction(proposalResponses, proposal);
	const proposal_bytes = unsignedTx.toBuffer();
	const signature = signingIdentity.sign(proposal_bytes);
	return await exports.sendSignedTransaction({signature, proposal_bytes}, orderer, timeout);
};