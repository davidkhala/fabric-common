const Logger = require('khala-logger/log4js');
const logger = Logger.consoleLogger('channel');
const fs = require('fs');
const {getNonce} = require('khala-fabric-formatter/helper');

const ChannelUpdate = require('khala-fabric-admin/channelUpdate');
const SigningIdentityUtil = require('khala-fabric-admin/signingIdentity');
const {extractConfigUpdate, extractLastConfigIndex, assertConfigBlock, extractConfigEnvelopeFromBlockData} = require('khala-fabric-formatter/protoTranslator');
const IdentityContext = require('fabric-common/lib/IdentityContext');
const EventHub = require('khala-fabric-admin/eventHub');
const {getSingleBlock} = require('./eventHub');
const CSCCProposal = require('khala-fabric-admin/CSCCProposal');
const {fromEvent} = require('khala-fabric-formatter/blockEncoder');
const {BlockNumberFilterType: {NEWEST}} = require('khala-fabric-formatter/eventHub');
/**
 * different from `peer channel create`, this will not response back with genesisBlock for this channel.
 * @deprecated system channel deprecate
 * @param {string} channelName
 * @param {Client.User} user
 * @param {Orderer} orderer
 * @param {string} channelConfigFile file path
 * @param {SigningIdentity[]} [signingIdentities]
 * @param {boolean} asEnvelop
 */
const create = async (channelName, user, orderer, channelConfigFile, signingIdentities = [], asEnvelop) => {
	logger.debug('create-channel', {channelName, channelConfigFile, orderer: orderer.toString()});

	const channelConfig = fs.readFileSync(channelConfigFile);
	const mainSigningIdentity = user.getSigningIdentity();
	const channelUpdate = new ChannelUpdate(channelName, user, orderer.committer, logger);
	if (asEnvelop) {
		channelUpdate.useEnvelope(channelConfig);
	} else {

		// extract the channel config bytes from the envelope to be signed
		const config = extractConfigUpdate(channelConfig);
		const signatures = [];
		if (signingIdentities.length === 0) {
			signingIdentities.push(mainSigningIdentity);
		}
		for (const signingIdentity of signingIdentities) {
			const extraSigningIdentityUtil = new SigningIdentityUtil(signingIdentity);
			signatures.push(extraSigningIdentityUtil.signChannelConfig(config, getNonce(), true));
		}
		channelUpdate.useSignatures(config, signatures);
	}

	const {status, info} = await channelUpdate.submit();
	const swallowPattern = `error applying config update to existing channel '${channelName}': error authorizing update: error validating ReadSet: proposed update requires that key [Group]  /Channel/Application be at version 0, but it is currently at version 1`;
	if (status === 'BAD_REQUEST' && info === swallowPattern) {
		logger.warn('create-channel', `[${status}] channel[${channelName}] exist already`);
	}
	return {status, info};
};

/**
 *
 * @param channel
 * @param {Client.User} user
 * @param {Orderer} orderer
 * @param verbose
 * @param [blockTime] wait x ms if block is still UNAVAILABLE, then retry
 * @return {Promise<Object|Buffer>} if !!verbose, it returns a decoded block object
 */
const getGenesisBlock = async (channel, user, orderer, verbose, blockTime = 1000) => {

	const identityContext = new IdentityContext(user, null);

	let block;
	if (verbose) {
		const eventHub = new EventHub(channel, [orderer.eventer]);
		block = await getSingleBlock(eventHub, identityContext, 0);
		await eventHub.disconnect();
		orderer.reset();
	} else {
		const signingIdentityUtil = new SigningIdentityUtil(user.getSigningIdentity());
		identityContext.calculateTransactionId();
		const eventBlock = await signingIdentityUtil.getSpecificBlock(identityContext, channel.name, orderer, 0, {waitIfUNAVAILABLE: blockTime});
		block = fromEvent({block: eventBlock});
	}


	return block;

};
/**
 * @param {string} channelName
 * @param {Client.User} user
 * @param {Orderer} orderer
 */
const getChannelConfigFromOrderer = async (channelName, user, orderer) => {

	const identityContext = new IdentityContext(user, null);
	const signingIdentityUtil = new SigningIdentityUtil(user.getSigningIdentity());
	identityContext.calculateTransactionId();
	const eventBlock = await signingIdentityUtil.getSpecificBlock(identityContext, channelName, orderer, NEWEST);

	const lastConfigBlockHeight = extractLastConfigIndex(eventBlock);

	logger.info(`found lastConfigBlock[${lastConfigBlockHeight}] for channel [${channelName}]`);

	const eventLastConfigBlock = await signingIdentityUtil.getSpecificBlock(identityContext, channelName, orderer, lastConfigBlockHeight);

	assertConfigBlock(eventLastConfigBlock);

	return extractConfigEnvelopeFromBlockData(eventLastConfigBlock.data.data[0]);
};


/**
 * @param {Client.Channel} channel
 * @param {Peer[]} peers
 * @param {Client.User} user
 * @param {string} [blockFile] genesis block file
 * @param {Orderer} [orderer] required if blockFile is not provided
 * @returns {Promise<ProposalResponseBundle>}
 */
const join = async (channel, peers, user, blockFile, orderer) => {
	logger.debug('join-channel', {
		channelName: channel.name,
		user: user.toString(),
		peers: peers.map((peer) => peer.toString())
	});

	let block;
	if (!blockFile) {
		block = await getGenesisBlock(channel, user, orderer);
	} else {
		block = fs.readFileSync(blockFile);
	}
	for (const peer of peers) {
		await peer.endorser.connect();
	}
	const identityContext = new IdentityContext(user, null);
	const proposal = new CSCCProposal(identityContext, peers.map(({endorser}) => endorser));
	const result = await proposal.joinChannel(block);

	const {errors, responses} = result;

	responses.forEach(({response}, index) => {
		const {status, message} = response;
		if (status === 500 && message === 'cannot create ledger from genesis block: LedgerID already exists') {
			logger.warn(`${peers[index].toString()} has joined channel [${channel.name}] already`);
		} else if (status === 200 && message === '') {
			logger.info(`${peers[index].toString()} join channel [${channel.name}] success`);
		} else {
			logger.error(`${peers[index].toString()}`, response);
		}
	});

	return result;

};

module.exports = {
	getGenesisBlock,
	getChannelConfigFromOrderer,
	create,
	join
};

