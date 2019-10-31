const Logger = require('./logger');

const {chaincodeProposal, transactionProposal, invokeCommit} = require('./chaincode');
const EventHub = require('./eventHub');
/**
 * @param eventHub
 * @param txId
 * @param eventTimeOut
 * @return {Promise<{tx,code}>}
 */
const txTimerPromise = (eventHub, {txId}, eventTimeOut) => {
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
 * @typedef {Object} chaincodeProposalOpts
 * @property {string} chaincodeId
 * @property {string} chaincodeVersion
 * @property {string[]} args
 * @property {string} fcn
 * @property {Object} endorsementPolicy
 * @property {Object} collectionConfig
 * @property {Object} transientMap
 * @property {string} chaincodeType Type of chaincode. One of 'golang', 'car', 'java' or 'node'.
 */

/**
 * @param {string} command deploy|upgrade
 * @param {Channel} channel
 * @param {Peer[]} peers default: all peers in channel
 * @param {EventHub[]} eventHubs
 * @param {chaincodeProposalOpts} opts
 * @param {Orderer} orderer
 * @param {number} proposalTimeOut
 * @param {number} eventTimeOut default: 30000
 */
exports.instantiateOrUpgrade = async (
	command, channel, peers, eventHubs,
	opts, orderer, proposalTimeOut = 50000 * peers.length,
	eventTimeOut = 30000
) => {
	const logger = Logger.new(`${command}-chaincode`, true);

	try {
		const nextRequest = await chaincodeProposal(command, channel, peers, opts, proposalTimeOut);
		const {txId} = nextRequest;
		if (!txId) {// swallow case
			return;
		}

		const promises = [];
		for (const eventHub of eventHubs) {
			promises.push(txTimerPromise(eventHub, {txId}, eventTimeOut));
		}

		nextRequest.orderer = orderer;
		const response = await channel.sendTransaction(nextRequest);
		logger.info('channel.sendTransaction', response);
		await Promise.all(promises);
	} finally {
		for (const eventHub of eventHubs) {
			eventHub.disconnect();
		}
	}

};


/**
 *
 * @param {Client} client
 * @param {string} channelName
 * @param {Peer[]} peers
 * @param {ChannelEventHub[]} eventHubs
 * @param {string} chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {Object} transientMap key<string> -> value<string>
 * @param {Orderer} orderer target orderer
 * @param {number} [proposalTimeout] default to 30000 ms
 * @param {number} [commitTimeout] default to 30000 ms
 * @param {number} [eventTimeout] default to 30000 ms
 * @return {Promise<{txEventResponses: any[], proposalResponses}>} TODO what is the predefined type for txEventResponses
 */
exports.invoke = async (client, channelName, peers, eventHubs, {
	chaincodeId, fcn, args, transientMap
}, orderer, proposalTimeout, commitTimeout, eventTimeout) => {
	const logger = Logger.new('chaincode:invoke', true);
	logger.debug({channel: channelName, peersSize: peers.length, chaincodeId, fcn, args, transientMap});
	if (!proposalTimeout) {
		proposalTimeout = 30000;
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
		promises.push(txTimerPromise(eventHub, {txId}, eventTimeout));
	}

	await invokeCommit(client, nextRequest, orderer, commitTimeout);

	const txEventResponses = await Promise.all(promises);
	return {txEventResponses, proposalResponses};
};
exports.txTimerPromise = txTimerPromise;
