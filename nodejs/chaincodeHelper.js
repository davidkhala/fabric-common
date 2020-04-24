const Logger = require('./logger');
const {commit} = require('khala-fabric-sdk-node-builder/transaction');
const {chaincodeProposal} = require('./chaincode');
const {transactionProposal} = require('khala-fabric-sdk-node-builder/transaction');
/**
 * @param {EventHub} eventHub
 * @param txId
 * @param eventTimeOut
 * @return {Promise<{tx,code}>}
 */
const txTimerPromise = (eventHub, txId, eventTimeOut) => {
	return new Promise((resolve, reject) => {
		eventHub.txEvent({txId}, undefined, (tx, code, blockNum) => {
			clearTimeout(timerID);
			resolve({tx, code, blockNum});
		}, (err) => {
			clearTimeout(timerID);
			reject(err);
		});
		const timerID = setTimeout(() => {
			const err = Error('txTimeout');
			reject(err);
		}, eventTimeOut);
	});
};


/**
 * @typedef {Object} ChaincodeProposalOpts
 * @property {string} chaincodeId
 * @property {string} chaincodeVersion
 * @property {string[]} args
 * @property {string} fcn
 * @property {Object} endorsementPolicy
 * @property {Object} collectionConfig
 * @property {TransientMap} [transientMap]
 * @property {Client.ChaincodeType} chaincodeType
 */

/**
 * @param {ChaincodeProposalCommand} command
 * @param {Channel} channel
 * @param {Client.Peer[]} peers default: all peers in channel
 * @param {EventHub[]} eventHubs
 * @param {ChaincodeProposalOpts} opts
 * @param {Orderer} orderer
 * @param {number} [proposalTimeout]
 * @param {number} [commitTimeout]
 * @param {number} [eventTimeout]
 */
exports.instantiateOrUpgrade = async (
	command, channel, peers, eventHubs,
	opts, orderer, proposalTimeout, commitTimeout, eventTimeout
) => {
	const logger = Logger.new(`${command}-chaincode`, true);
	if (!proposalTimeout) {
		proposalTimeout = 50000 * peers.length;
	}
	if (!commitTimeout) {
		commitTimeout = 30000;
	}
	if (!eventTimeout) {
		eventTimeout = 30000;
	}
	const nextRequest = await chaincodeProposal(command, channel, peers, opts, proposalTimeout);
	const {txId} = nextRequest;
	// TODO interceptor here

	const promises = [];
	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, txId, eventTimeout));
	}

	nextRequest.orderer = orderer;
	const response = await channel.sendTransaction(nextRequest, commitTimeout);
	logger.info('channel.sendTransaction', response);
	await Promise.all(promises);

};


/**
 *
 * @param {Client} client
 * @param {string} channelName
 * @param {Client.Peer[]} peers
 * @param {EventHub[]} eventHubs
 * @param {string} chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {TransientMap} [transientMap]
 * @param {Client.Orderer} orderer target orderer
 * @param {number} [proposalTimeout]
 * @param {number} [commitTimeout]
 * @param {number} [eventTimeout]
 * @return {Promise<{txEventResponses: any[], proposalResponses}>} TODO what is the predefined type for txEventResponses
 */
exports.invoke = async (client, channelName, peers, eventHubs, {
	chaincodeId, fcn, args, transientMap
}, orderer, proposalTimeout, commitTimeout, eventTimeout) => {
	const logger = Logger.new('chaincode:invoke', true);
	logger.debug({channel: channelName, chaincodeId, fcn, args});
	logger.debug({peers, args, transientMap});
	if (!proposalTimeout) {
		proposalTimeout = 50000 * peers.length;
	}
	if (!commitTimeout) {
		commitTimeout = 30000;
	}
	if (!eventTimeout) {
		eventTimeout = 30000;
	}

	const nextRequest = await transactionProposal(client, peers, channelName, {
		chaincodeId,
		fcn,
		args,
		transientMap
	}, proposalTimeout);

	const {txId, proposalResponses} = nextRequest;
	const promises = [];

	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, txId, eventTimeout));
	}
	await commit(client._userContext._signingIdentity, nextRequest, orderer, commitTimeout);

	const txEventResponses = await Promise.all(promises);
	return {txEventResponses, proposalResponses};
};
exports.txTimerPromise = txTimerPromise;
