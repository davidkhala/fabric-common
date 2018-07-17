const logger = require('./logger').new('channel');
const fs = require('fs');
const {signs} = require('./multiSign');
const EventHubUtil = require('./eventHub');
exports.setClientContext = (channel, clientContext) => {
	channel._clientContext = clientContext;
};
/**
 * New feature introduced from 1.1.0-alpha
 */
exports.newEventHub = (channel, peer) => {
	channel.newChannelEventHub(peer);
};
exports.nameMatcher = (channelName, toThrow) => {
	const namePattern = /^[a-z][a-z0-9.-]*$/;
	const result = channelName.match(namePattern);
	if (!result && toThrow) {
		throw Error(`invalid channel name ${channelName}; should match regx: ${namePattern}`);
	}
	return result;
};
/**
 * @param {Client} client
 * @param {string} channelName
 * @returns {Channel}
 */
exports.new = (client, channelName) => {

	if (!channelName) {
		logger.warn('default to using system channel', exports.genesis);
		channelName = exports.genesis;
	} else {
		exports.nameMatcher(channelName, true);
	}

	delete client._channels[channelName];//Always renew, otherwise throw exception if exist
	return client.newChannel(channelName);
};
exports.genesis = 'testchainid';

/**
 *
 * @param {Promise<Client>[]} signClients
 * @param {Channel} channel
 * @param {string} channelConfigFile file path
 * @param {Orderer} orderer
 * @returns {PromiseLike<T> | Promise<T>}
 */
exports.create = async (signClients, channel, channelConfigFile, orderer) => {
	const logger = require('./logger').new('create-channel');
	const channelName = channel.getName();
	logger.debug({channelName, channelConfigFile});

	const channelClient = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(channelConfigFile);

	// extract the channel config bytes from the envelope to be signed
	const channelConfig = channelClient.extractChannelConfig(channelConfig_envelop);
	const {signatures} = await signs(signClients, channelConfig);
	const txId = channelClient.newTransactionID();
	const request = {
		config: channelConfig,
		signatures,
		name: channelName,
		orderer,
		txId
	};
	logger.debug('signatures', signatures.length);

	//The client application must poll the orderer to discover whether the channel has been created completely or not.
	const results = await channelClient.createChannel(request);
	logger.debug('channel created', results);
	const {status, info} = results;
	if (status === 'SUCCESS') return results;
	else throw results;
};


/**
 * to be atomic, join 1 peer each time
 * @param channel
 * @param peer
 * @param eventHub
 * @param orderer
 * @returns {Promise<*>}
 */
exports.join = async (channel, peer, eventHub, orderer) => {
	const logger = require('./logger').new('join-channel');
	logger.debug({channelName: channel.getName(), peer: peer._options});

	const channelClient = channel._clientContext;
	const genesis_block = await channel.getGenesisBlock({orderer});
	logger.debug('signature identity', channelClient.getUserContext().getName());
	const request = {
		targets: [peer],
		txId: channelClient.newTransactionID(),
		block: genesis_block
	};

	const eventHubClient = eventHub._clientContext;

	const validator = ({block}) => {
		logger.info('new block event arrived', eventHub._ep, 'block header:', block.header);
		// in real-world situations, a peer may have more than one channels so
		// we must check that this block came from the channel we asked the peer to join
		if (block.data.data.length === 1) {
			// Config block must only contain one transaction
			if (block.data.data[0].payload.header.channel_header.channel_id
				=== channel.getName()) {
				return {valid: true, interrupt: true};
			}
		}
		return {valid: false, interrupt: false};
	};
	let eventID;
	const promise = new Promise((resolve, reject) => {
		const onSucc = (_) => resolve(_);
		const onErr = (e) => reject(e);
		eventID = EventHubUtil.blockEvent(eventHub, validator, onSucc, onErr);
	});


	const data = await channel.joinChannel(request);
	//FIXME bug design in fabric: error message occurred in Promise.resolve/then
	const joinedBefore = [];
	const joinedBeforeSymptom = '(status: 500, message: Cannot create ledger from genesis block, due to LedgerID already exists)';
	for (const dataEntry of data) {
		if (dataEntry instanceof Error) {
			//swallow 'joined before' error
			if (dataEntry.toString().includes(joinedBeforeSymptom)) {
				logger.warn('swallow when existence');
				joinedBefore.push(dataEntry);
			} else {
				throw data;
			}
		}
	}
	if (joinedBefore.length === data.length) {
		//when all joined before
		logger.info('all joined before');
		eventHub.unregisterBlockEvent(eventID);
		eventHub.disconnect();
		return data;
	} else {
		return await promise;
	}
};