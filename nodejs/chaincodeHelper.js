const Logger = require('./logger');

const {chaincodeProposal, transactionProposal, invokeCommit} = require('./chaincode');
const {txEventCode, txEvent, disconnect} = require('./eventHub');
/**
 * @param eventHub
 * @param txId
 * @param eventWaitTime
 * @return {Promise<{tx,code,err}>}
 */
const txTimerPromise = (eventHub, {txId}, eventWaitTime) => {
	const logger = Logger.new('newTxEvent', true);
	const validator = ({tx, code, blockNum}) => {
		logger.debug({tx, code, blockNum});
		return {valid: code === txEventCode[0], interrupt: true};
	};
	return new Promise((resolve, reject) => {
		txEvent(eventHub, {txId}, validator, (data) => {
			clearTimeout(timerID);
			const {tx, code, interrupt} = data;
			if (interrupt) {
				disconnect(eventHub);
			}
			resolve({tx, code});
		}, (err) => {
			if (err.interrupt) {
				disconnect(eventHub);
			}
			clearTimeout(timerID);
			reject({err});
		});
		const timerID = setTimeout(() => {
			disconnect(eventHub);
			reject({err: 'txTimeout'});
		}, eventWaitTime);
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
 * @property {string} chaincodeType Type of chaincode. One of 'golang', 'car', 'java' or 'node'.
 */

/**
 * @param {string} command 'deploy' or 'upgrade'
 * @param channel
 * @param {Peer[]} peers default: all peers in channel
 * @param {EventHub[]} eventHubs
 * @param {chaincodeProposalOpts} opts
 * @param {number} proposalTimeOut
 * @param {number} eventWaitTime default: 30000
 * @returns {Promise}
 */
exports.instantiateOrUpgrade = async (
	command, channel, peers, eventHubs,
	opts, proposalTimeOut,
	eventWaitTime = 30000,
) => {
	const logger = Logger.new(`${command}-chaincode`, true);
	const nextRequest = await chaincodeProposal(command, channel, peers, opts, proposalTimeOut);

	const {txId} = nextRequest;
	if (!txId) {// swallow case
		for (const eventHub of eventHubs) {
			disconnect(eventHub);
		}
		return;
	}

	const promises = [];
	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, {txId}, eventWaitTime));
	}

	const response = await channel.sendTransaction(nextRequest);
	logger.info('channel.sendTransaction', response);
	return Promise.all(promises);
};


/**
 *
 * @param channel
 * @param peers
 * @param {ChannelEventHub[]} eventHubs
 * @param chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {Object} transientMap key<string> -> value<string>
 * @param {Orderer} orderer target orderer, default to pick one in channel
 * @param proposalTimeout
 * @param {Number} eventWaitTime optional, default to use 30000 ms
 * @return {Promise<{txEventResponses: any[], proposalResponses}>}
 */
exports.invoke = async (channel, peers, eventHubs, {
	chaincodeId, fcn, args, transientMap,
}, orderer, proposalTimeout, eventWaitTime) => {
	const logger = Logger.new('chaincode:invoke', true);
	logger.debug({channel: channel.getName(), peersSize: peers.length, chaincodeId, fcn, args});
	if (!proposalTimeout) {
		proposalTimeout = 30000;
	}
	if (!eventWaitTime) {
		eventWaitTime = 30000;
	}
	const client = channel._clientContext;

	const nextRequest = await transactionProposal(client, peers, channel.getName(), {
		chaincodeId,
		fcn,
		args,
		transientMap,
	}, proposalTimeout);

	const {txId, proposalResponses} = nextRequest;
	const promises = [];

	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, {txId}, eventWaitTime));
	}

	await invokeCommit(client, nextRequest, orderer);

	const txEventResponses = await Promise.all(promises);
	return {txEventResponses, proposalResponses};
};
