const Logger = require('khala-logger/log4js');
const logger = Logger.consoleLogger('channel');
const fs = require('fs');
const {sleep} = require('khala-light-util');

const ChannelUpdate = require('khala-fabric-admin/channelUpdate');
const SigningIdentityUtil = require('khala-fabric-admin/signingIdentity');
const {extractChannelConfig} = require('./admin/channelConfig');
/**
 * different from `peer channel create`, this will not response back with genesisBlock for this channel.
 *
 * @param {string} channelName
 * @param {Client.User} user
 * @param {Orderer} orderer
 * @param {string} channelConfigFile file path
 * @param {SigningIdentity[]} [signingIdentities]
 * @param {boolean} asEnvelop
 */
exports.create = async (channelName, user, orderer, channelConfigFile, signingIdentities = [], asEnvelop) => {
	logger.debug('create-channel', {channelName, channelConfigFile, orderer: orderer.toString()});

	const channelConfig = fs.readFileSync(channelConfigFile);
	const mainSigningIdentity = user.getSigningIdentity();
	const channelUpdate = new ChannelUpdate(channelName, user, orderer.committer, logger);
	if (asEnvelop) {
		channelUpdate.useEnvelope(channelConfig);
	} else {

		// extract the channel config bytes from the envelope to be signed
		const config = extractChannelConfig(channelConfig);
		const signatures = [];
		if (signingIdentities.length === 0) {
			signingIdentities.push(mainSigningIdentity);
		}
		for (const signingIdentity of signingIdentities) {
			const extraSigningIdentityUtil = new SigningIdentityUtil(signingIdentity);
			signatures.push(extraSigningIdentityUtil.signChannelConfig(config));
		}

		channelUpdate.useSignatures(config, signatures);
	}

	await orderer.connect();
	const {status, info} = await channelUpdate.submit();
	const swallowPattern = `error applying config update to existing channel '${channelName}': error authorizing update: error validating ReadSet: proposed update requires that key [Group]  /Channel/Application be at version 0, but it is currently at version 1`;
	if (status === 'BAD_REQUEST' && info === swallowPattern) {
		logger.warn('create-channel', `[${status}] channel[${channelName}] exist already`);
	}
	return {status, info};
};
//TODO WIP
const getGenesisBlock = async (channel, user, orderer) => {
	const EventHub = require('khala-fabric-admin/eventHub');
	const IdentityContext = require('fabric-common/lib/IdentityContext');
	const {BlockNumberFilterType: {NEWEST, OLDEST}} = require('khala-fabric-formatter/eventHub');

	const targets = [orderer];
	const eventhub = new EventHub(channel, targets);

	const identityContext = new IdentityContext(user, null);
	const startBlock = OLDEST;
	const endBlock = NEWEST;
	eventhub.build(identityContext, {startBlock, endBlock});
	await eventhub.connect();
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
	logger.debug('join-channel', {channelName: channel.getName(), peer: peer.getName()});

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
		logger.warn('join-channel', dataEntry);
		const errMessage = dataEntry.message;
		const swallowSymptoms = ['NOT_FOUND', 'Stream removed'];

		if (swallowSymptoms.map((symptom) => errMessage.includes(symptom)).find((isMatched) => !!isMatched) && waitTime) {
			logger.warn('join-channel', 'loopJoinChannel...', errMessage);
			await sleep(waitTime);
			return await join(channel, peer, block, orderer, waitTime);
		}
		if (errMessage.includes(joinedBeforeSymptom)) {
			// swallow 'joined before' error
			logger.info('join-channel', 'peer joined before', peer.getName());
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

