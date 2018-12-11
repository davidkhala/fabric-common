const logger = require('./logger').new('channel');
const fs = require('fs');
const {signs} = require('./multiSign');
const Channel = require('fabric-client/lib/Channel');
const {sleep} = require('khala-nodeutils/helper');
exports.setClientContext = (channel, clientContext) => {
	channel._clientContext = clientContext;
};
exports.clearOrderers = (channel) => {
	channel._orderers = new Map();
};
exports.getOrderers = (channel) => {
	const result = {};
	for (const [key, value] of channel._orderers) {
		result[key] = value;
	}
	return result;
};
exports.clearPeers = (channel) => {
	channel._channel_peers = new Map();
};
/**
 * could be ignored from 1.2
 * @author davidliu
 * @param channelName
 * @param toThrow
 * @returns {*}
 */
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
	}
	return new Channel(channelName, client);
};
/**
 * This is designed to be along with channel.sendTransaction
 * @param {Client} client
 * @returns {Channel}
 */
exports.newDummy = (client) => {
	return exports.new(client, 'dummy');
};

exports.genesis = 'testchainid';


/**
 *
 * @param {Client[]} signClients
 * @param {Channel} channel
 * @param {string} channelConfigFile file path
 * @param {Orderer} orderer
 * @returns {Promise<T>}
 */
exports.create = async (signClients, channel, channelConfigFile, orderer) => {
	const logger = require('./logger').new('create-channel');
	const channelName = channel.getName();
	logger.debug({channelName, channelConfigFile});

	const channelClient = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(channelConfigFile);

	// extract the channel config bytes from the envelope to be signed
	const channelConfig = channelClient.extractChannelConfig(channelConfig_envelop);
	const {signatures} = signs(signClients, channelConfig);
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
	const {status, info} = results;
	logger.debug('response', {status, info}, results);
	if (status === 'SUCCESS') return results;
	else {
		if (status === 'SERVICE_UNAVAILABLE' && info === 'will not enqueue, consenter for this channel hasn\'t started yet') {
			logger.warn('loop retry..');
			await sleep(1000);
			return exports.create(signClients, channel, channelConfigFile, orderer);
		} else throw results;
	}
};

exports.initialize = async (channel, peer) => {
	return channel.initialize({target: peer, discover: true, asLocalhost: false});
};

/**
 * to be atomic, join 1 peer each time
 * @param {Channel} channel
 * @param {Peer} peer
 * @param {Orderer} orderer
 * @param {number} waitTime default 1000, if set to false, will not retry channel join
 * @returns {Promise<*>}
 */
exports.join = async (channel, peer, orderer, waitTime = 1000) => {
	const logger = require('./logger').new('join-channel', true);
	logger.debug({channelName: channel.getName(), peer: peer._name});

	const channelClient = channel._clientContext;
	const genesis_block = await channel.getGenesisBlock({orderer});
	const request = {
		targets: [peer],
		txId: channelClient.newTransactionID(),
		block: genesis_block
	};

	const data = await channel.joinChannel(request);
	const joinedBeforeSymptom = 'LedgerID already exists';
	const dataEntry = data[0];

	if (dataEntry instanceof Error) {
		logger.warn(dataEntry);
		const errString = dataEntry.toString();
		if (errString.includes('Stream removed') && waitTime) {
			logger.warn('loopJoinChannel...', errString);
			await sleep(waitTime);
			return await exports.join(channel, peer, orderer, waitTime);
		}
		if (errString.includes(joinedBeforeSymptom)) {
			//swallow 'joined before' error
			logger.info('peer joined before', peer._name);
			return;
		}
		throw dataEntry;
	}

	const {response: {status, message}} = dataEntry;
	if (status !== 200) {
		throw {status, message};
	}
	return dataEntry;

};

/**
 * take effect in next block, it is recommended to register a block event after
 * @param channel
 * @param anchorPeerTxFile
 * @param orderer
 * @returns {Promise<BroadcastResponse>}
 */
exports.updateAnchorPeers = async (channel, anchorPeerTxFile, orderer) => {

	const client = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(anchorPeerTxFile);
	const channelConfig = client.extractChannelConfig(channelConfig_envelop);
	const {signatures} = signs([client], channelConfig);

	const request = {
		config: channelConfig,
		signatures,
		name: channel.getName(),
		orderer,
		txId: client.newTransactionID()
	};

	const result = await client.updateChannel(request);
	if (result.status !== 'SUCCESS') {
		throw JSON.stringify(result);
	}

	logger.info('set anchor peers', result);
	return result;
};
exports.pretty = (channel) => {
	return {
		name: channel._name,
		peers: channel._channel_peers,
		anchorPeers: channel._anchor_peers,
		orderers: channel._orderers,
		kafkas: channel._kafka_brokers,
	};
};
