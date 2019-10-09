const Logger = require('./logger');
const logger = Logger.new('channel');
const fs = require('fs');
const {signs} = require('./multiSign');
const Channel = require('fabric-client/lib/Channel');
const {sleep} = require('khala-nodeutils/helper');
const OrdererUtil = require('./orderer');
const Orderer = require('fabric-client/lib/Orderer');
exports.setClientContext = (channel, clientContext) => {
	channel._clientContext = clientContext;
};
exports.clearOrderers = (channel) => {
	channel._orderers = new Map();
};
exports.clearPeers = (channel) => {
	channel._channel_peers = new Map();
};
exports.getOrderers = async (channel, healthyOnly) => {
	const orderers = channel.getOrderers();
	if (healthyOnly) {
		const result = [];
		for (const orderer of orderers) {
			const isAlive = await OrdererUtil.ping(orderer);
			if (isAlive) {
				result.push(orderer);
			}
		}
		logger.debug(`${result.length} alive in ${channel.getName()}`);
		return result;
	} else {
		return orderers;
	}
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
 * different from `peer channel create`, this will not response back with genesisBlock for this channel.
 *
 * @param {Client[]} signClients
 * @param {Channel} channel
 * @param {string} channelConfigFile file path
 * @param {Orderer} orderer
 * @returns {Promise<Client.BroadcastResponse>}
 */
exports.create = async (signClients, channel, channelConfigFile, orderer) => {
	const logger = Logger.new('create-channel');
	const channelName = channel.getName();
	logger.debug({channelName, channelConfigFile, orderer: orderer.toString()});

	const channelClient = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(channelConfigFile);

	// extract the channel config bytes from the envelope to be signed
	const channelConfig = channelClient.extractChannelConfig(channelConfig_envelop);
	const signatures = signs(signClients, channelConfig);
	const txId = channelClient.newTransactionID();
	const request = {
		config: channelConfig,
		signatures,
		name: channelName,
		orderer,
		txId
	};
	logger.debug('signatures', signatures.length);

	// The client application must poll the orderer to discover whether the channel has been created completely or not.
	const result = await channelClient.createChannel(request);
	const {status, info} = result;
	if (status === 'SUCCESS') {
		logger.info('response', result);
		return result;
	} else {
		if (status === 'SERVICE_UNAVAILABLE' && info === 'will not enqueue, consenter for this channel hasn\'t started yet') {
			logger.warn('loop retry..', result);
			await sleep(1000);
			return exports.create(signClients, channel, channelConfigFile, orderer);
		} else if (status === 'BAD_REQUEST' && info === 'error authorizing update: error validating ReadSet: readset expected key [Group]  /Channel/Application at version 0, but got version 1') {
			logger.warn('exist swallow', result);
			return result;
		} else {
			const err = Object.assign(Error('create channel'), result);
			logger.error(result);
			throw err;
		}
	}
};

const getGenesisBlock = async (channel, orderer, waitTime = 1000) => {
	try {
		const block = await channel.getGenesisBlock({orderer});
		logger.info('getGenesisBlock', `from orderer: ${orderer.getName()}`);
		return block;
	} catch (e) {
		const {message} = e;
		if (message.includes('SERVICE_UNAVAILABLE') || message.includes('NOT_FOUND')) {
			await sleep(waitTime);
			return getGenesisBlock(channel, orderer, waitTime);
		} else {
			throw e;
		}
	}
};
exports.getGenesisBlock = getGenesisBlock;

/**
 * different from `peer channel join`, since we do not have genesisBlock as output of `peer channel create`, we have to prepared one before.
 * to be atomic, join 1 peer each time
 * @param {Channel} channel
 * @param {Client.Peer} peer
 * @param {Object} [block] genesis_block
 * @param {Orderer} [orderer] required if block is not provided
 * @param {number} waitTime default 1000, if set to false, will not retry channel join
 * @returns {Promise<*>}
 */
const join = async (channel, peer, block, orderer, waitTime = 1000) => {
	const logger = Logger.new('join-channel', true);
	logger.debug({channelName: channel.getName(), peer: peer.getName()});

	const channelClient = channel._clientContext;
	if (!block) {
		if (orderer instanceof Orderer) {
			block = await getGenesisBlock(channel, orderer);
		} else {
			throw Error('either block: genesis_block or Orderer is required');
		}
	}

	const request = {
		targets: [peer],
		txId: channelClient.newTransactionID(),
		block
	};

	const data = await channel.joinChannel(request);
	const joinedBeforeSymptom = 'LedgerID already exists';
	const dataEntry = data[0];

	if (dataEntry instanceof Error) {
		logger.warn(dataEntry);
		const errMessage = dataEntry.message;
		const swallowSymptoms = ['NOT_FOUND', 'Stream removed'];

		if (swallowSymptoms.map((symptom) => errMessage.includes(symptom)).find((isMatched) => !!isMatched) && waitTime) {
			logger.warn('loopJoinChannel...', errMessage);
			await sleep(waitTime);
			return await join(channel, peer, block, orderer, waitTime);
		}
		if (errMessage.includes(joinedBeforeSymptom)) {
			// swallow 'joined before' error
			logger.info('peer joined before', peer.getName());
			return;
		}
		throw dataEntry;
	}

	const {response: {status, message}} = dataEntry;
	if (status !== 200) {
		throw Error(JSON.stringify({status, message}));
	}
	return dataEntry;

};

exports.join = join;

/**
 * take effect in next block, it is recommended to register a block event after
 * @param {Channel} channel
 * @param {string} anchorPeerTxFile filePath
 * @param {Orderer} orderer
 * @returns {Promise<BroadcastResponse>}
 */
exports.updateAnchorPeers = async (channel, anchorPeerTxFile, orderer) => {

	const client = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(anchorPeerTxFile);
	const channelConfig = client.extractChannelConfig(channelConfig_envelop);
	const signatures = signs([client], channelConfig);

	const request = {
		config: channelConfig,
		signatures,
		name: channel.getName(),
		orderer,
		txId: client.newTransactionID()
	};

	const result = await client.updateChannel(request);
	const {status, info} = result;
	if (status !== 'SUCCESS') {
		throw Object.assign(Error('updateAnchorPeer'), {status, info});
	}

	logger.info('set anchor peers', result);
	return result;
};
exports.pretty = (channel) => {
	return {
		client: channel._clientContext,
		name: channel._name,
		peers: channel._channel_peers,
		anchorPeers: channel._anchor_peers,
		orderers: channel._orderers,
		kafkas: channel._kafka_brokers
	};
};
