const Logger = require('khala-logger/log4js');
const logger = Logger.consoleLogger('channel');
const fs = require('fs');
const {signChannelConfig} = require('./multiSign');
const {sleep} = require('khala-nodeutils/helper');

const ChannelConfig = require('./channelConfig');
/**
 * different from `peer channel create`, this will not response back with genesisBlock for this channel.
 * TODO could we directly use signed channel.tx file to create/update channel, put this to binManager via `peer channel signconfigtx`
 * @param {Channel} channel
 * @param {Orderer} orderer
 * @param {string} channelConfigFile file path
 * @param {Client[]} [signers]
 * @returns {Promise<Client.BroadcastResponse>}
 */
exports.create = async (channel, orderer, channelConfigFile, signers = [channel._clientContext]) => {
	const logger = Logger.consoleLogger('create-channel');
	logger.debug({channelName: channel.getName(), channelConfigFile, orderer: orderer.toString()});

	const channelClient = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(channelConfigFile);
	// extract the channel config bytes from the envelope to be signed
	const config = channelClient.extractChannelConfig(channelConfig_envelop);

	const signatures = signChannelConfig(signers, config);
	try {
		return await ChannelConfig.channelUpdate(channel, orderer, undefined, undefined, undefined, {
			config,
			signatures
		});
	} catch (e) {
		const {status, info} = e;
		if (status === 'SERVICE_UNAVAILABLE' && info === 'will not enqueue, consenter for this channel hasn\'t started yet') {
			// TODO [fabric weakness] let healthz return whether it is ready
			logger.warn('loop retry..', status);
			await sleep(1000);
			return await exports.create(channel, orderer, channelConfigFile);
		} else if (status === 'BAD_REQUEST' && info === 'error authorizing update: error validating ReadSet: readset expected key [Group]  /Channel/Application at version 0, but got version 1') {
			logger.warn('exist swallow', status);
			return {status, info};
		}
		throw e;
	}
};

const getGenesisBlock = async (channel, orderer, waitTime = 1000) => {
	try {
		const block = await channel.getGenesisBlock({orderer});
		logger.info(`getGenesisBlock from orderer: ${orderer.getName()}`);
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
	const logger = Logger.consoleLogger('join-channel', true);
	logger.debug({channelName: channel.getName(), peer: peer.getName()});

	const channelClient = channel._clientContext;
	if (!block) {
		block = await getGenesisBlock(channel, orderer);

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
