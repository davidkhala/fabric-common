const Logger = require('./logger');

const {chaincodeProposal, transactionProposal,
	invokeCommit, transientMapTransform, chaincodeProposalAdapter} = require('./chaincode');
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
	eventWaitTime = 30000
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
	chaincodeId, fcn, args, transientMap
}, orderer, proposalTimeout, eventWaitTime) => {
	const logger = Logger.new('chaincode:invoke', true);
	logger.debug({channel: channel.getName(), peersSize: peers.length, chaincodeId, fcn, args, transientMap});
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
		transientMap
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


/**
 * This method is enhanced to use the discovered peers to send the endorsement proposal
 *
 * @param channel
 * @param targets: Optional. use the peers included in the "targets" to endorse the proposal. If there is no "targets" parameter, the endorsement request will be handled by the endorsement handler.
 * @param required: Optional. An array of strings that represent the names of peers that are required for the endorsement. These will be the only peers which the proposal will be sent. This list only applies to endorsements using the discovery service.
 * @param ignore: Optional. An array of strings that represent the names of peers that should be ignored by the endorsement. This list only applies to endorsements using the discovery service.
 * @param preferred: Optional. An array of strings that represent the names of peers that should be given priority by the endorsement. Priority means that these peers will be chosen first for endorsements when an endorsement plan has more peers in a group then needed to satisfy the endorsement policy. This list only applies to endorsements using the discovery service.
 * @param requiredOrgs: Optional. An array of strings that represent the names of an organization's MSP id that are required for the endorsement. Only peers in these organizations will be sent the proposal. This list only applies to endorsements using the discovery service.
 * @param ignoreOrgs: Optional. An array of strings that represent the names of an organization's MSP id that should be ignored by the endorsement. This list only applies to endorsements using the discovery service.
 * @param preferredOrgs: Optional. An array of strings that represent the names of an organization's MSP id that should be given priority by the endorsement. Peers within an organization may have their ledger height considered using the optional property preferredHeightGap before being added to the priority list. This list only applies to endorsements using the discovery service.
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @returns {Promise<TransactionRequest>}
 */
const transactionProposalDefault = async (channel,
                                          targets,
                                          {required, ignore, preferred, requiredOrgs, ignoreOrgs, preferredOrgs},
                                          {chaincodeId, fcn, args, transientMap},
                                          proposalTimeout) => {
	const logger = Logger.new('chaincode:transactionProposalEnhanced', true);
	const txId = channel._clientContext.newTransactionID();
	const request = {
		txId,
		chaincodeId,
		fcn,
		args,
		transientMap: transientMapTransform(transientMap),
		required, ignore, preferred, requiredOrgs, ignoreOrgs, preferredOrgs
	};

	const [responses, proposal] = await channel.sendTransactionProposal(request, proposalTimeout);
	const ccHandler = chaincodeProposalAdapter('invoke', undefined, true);
	const {nextRequest, errCounter} = ccHandler([responses, proposal]);
	const {proposalResponses} = nextRequest;

	if (errCounter > 0) {
		logger.error({proposalResponses});
		throw {proposalResponses};
	}
	nextRequest.txId = txId;
	return nextRequest;
};
exports.queryDefault = transactionProposalDefault;
/**
 * The invokeCommit method is enhanced by service discovery, so no need to pass in orderer
 *
 * @param channel
 * @param nextRequest
 * @param timeout
 * @returns {Promise<Promise|Promise<Client.BroadcastResponse>>}
 */
const invokeCommitDefault = async (channel, nextRequest, timeout = 30000) => {
	return channel.sendTransaction(nextRequest, timeout);
};

/**
 * Invoke chaincode in an complete transaction flow:
 * 1. send transaction proposal to endorsers
 * 2. validate and combine the proposal response, then send the transaction to orderer
 * 3. wait until the transaction event received
 *
 * @param channel
 * @param targets: Optional. use the peers included in the "targets" to endorse the proposal. If there is no "targets" parameter, the endorsement request will be handled by the endorsement handler.
 * @param required: Optional. An array of strings that represent the names of peers that are required for the endorsement. These will be the only peers which the proposal will be sent. This list only applies to endorsements using the discovery service.
 * @param discoveryRestrictions
 * @param chaincodeId
 * @param fcn
 * @param args
 * @param transientMap
 * @param proposalTimeout
 * @param eventWaitTime
 * @returns {Promise<{txEventResponses: any[], proposalResponses: TransactionRequest.proposalResponses}>}
 */
exports.invokeDefault = async (channel,
                               targets,
                               discoveryRestrictions,
                               {chaincodeId, fcn, args, transientMap},
                               proposalTimeout = 30000,
                               eventWaitTime = 30000) => {
	const logger = Logger.new('chaincode:invokeEnhanced', true);
	logger.info('Invoke chaincode [%s::%s]', chaincodeId, fcn);

	const nextRequest = await transactionProposalDefault(
		channel,
		targets,
		discoveryRestrictions,
		{
			chaincodeId,
			fcn,
			args,
			transientMap
		},
		proposalTimeout
	);

	const {txId, proposalResponses} = nextRequest;
	const promises = [];

	const eventHubs = channel.getOrganizations().map(
		msp => channel.getChannelEventHubsForOrg(msp.id)
	).reduce((c1, c2) => c1.concat(c2));

	for (const eventHub of eventHubs) {
		eventHub.connect(true);
		promises.push(txTimerPromise(eventHub, {txId}, eventWaitTime));
	}

	const res = await invokeCommitDefault(channel, nextRequest);
	logger.info('SendTransaction response: ', res.status);
	const txEventResponses = await Promise.all(promises);

	return {txEventResponses, proposalResponses};
};
