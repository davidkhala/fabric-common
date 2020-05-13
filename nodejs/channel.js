const Logger = require('khala-logger/log4js');
const logger = Logger.consoleLogger('channel');
const fs = require('fs');

const ChannelUpdate = require('khala-fabric-admin/channelUpdate');
const SigningIdentityUtil = require('khala-fabric-admin/signingIdentity');
const {extractChannelConfig} = require('./admin/channelConfig');
const IdentityContext = require('fabric-common/lib/IdentityContext');
const EventHub = require('khala-fabric-admin/eventHub');
const {getSingleBlock, getLastBlock} = require('./eventHub');
const Proposal = require('khala-fabric-admin/proposal');
const {fromEvent} = require('khala-fabric-admin/blockEncoder');
/**
 * TODO WIP
 * different from `peer channel create`, this will not response back with genesisBlock for this channel.
 *
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

const getGenesisBlock = async (channel, user, orderer, verbose) => {

	const identityContext = new IdentityContext(user, null);

	let block;
	if (verbose) {
		const targets = [orderer];
		const eventHub = new EventHub(channel, targets);
		block = await getSingleBlock(eventHub, identityContext, 0);
		await eventHub.disconnect();
		orderer.resetEventer();
	} else {
		const signingIdentityUtil = new SigningIdentityUtil(user.getSigningIdentity());
		identityContext.calculateTransactionId();
		block = await signingIdentityUtil.getGenesisBlock(identityContext, channel.name, orderer);
	}


	return block;

};
/**
 * // TODO WIP
 * Asks the orderer for the current (latest) configuration block for this channel.
 * This is similar to [getGenesisBlock()]{@link Channel#getGenesisBlock}, except
 * that instead of getting block number 0 it gets the latest block that contains
 * the channel configuration, and only returns the decoded {@link ConfigEnvelope}.
 *
 * @returns {Promise} A Promise for a {@link ConfigEnvelope} object containing the configuration items.
 */
const getChannelConfigFromOrderer = async (channel, user, orderer) => {

	const targets = [orderer];
	const eventHub = new EventHub(channel, targets);

	const identityContext = new IdentityContext(user, null);
	const block = await getLastBlock(eventHub, identityContext);
	// logger.debug('%s - good results from seek block ', method); // :: %j',results);
	// // verify that we have the genesis block
	// if (block) {
	// 	logger.debug('%s - found latest block', method);
	// } else {
	// 	logger.error('%s - did not find latest block', method);
	// 	throw new Error('Failed to retrieve latest block', method);
	// }
	//
	// logger.debug('%s - latest block is block number %s', block.header.number);
	// // get the last config block number
	// const metadata = _commonProto.Metadata.decode(block.metadata.metadata[_commonProto.BlockMetadataIndex.LAST_CONFIG]);
	// const last_config = _commonProto.LastConfig.decode(metadata.value);
	// logger.debug('%s - latest block has config block of %s', method, last_config.index);
	//
	// txId = new TransactionID(signer);
	//
	// // now build the seek info to get the block called out
	// // as the latest config block
	// seekSpecifiedStart = new _abProto.SeekSpecified();
	// seekSpecifiedStart.setNumber(last_config.index);
	// seekStart = new _abProto.SeekPosition();
	// seekStart.setSpecified(seekSpecifiedStart);
	//
	// //   build stop
	// seekSpecifiedStop = new _abProto.SeekSpecified();
	// seekSpecifiedStop.setNumber(last_config.index);
	// seekStop = new _abProto.SeekPosition();
	// seekStop.setSpecified(seekSpecifiedStop);
	//
	// // seek info with all parts
	// seekInfo = new _abProto.SeekInfo();
	// seekInfo.setStart(seekStart);
	// seekInfo.setStop(seekStop);
	// seekInfo.setBehavior(_abProto.SeekInfo.SeekBehavior.BLOCK_UNTIL_READY);
	// // logger.debug('initializeChannel - seekInfo ::' + JSON.stringify(seekInfo));
	//
	// // build the header for use with the seekInfo payload
	// seekInfoHeader = client_utils.buildChannelHeader(
	// 	_commonProto.HeaderType.DELIVER_SEEK_INFO,
	// 	self._name,
	// 	txId.getTransactionID(),
	// 	self._initial_epoch,
	// 	null,
	// 	client_utils.buildCurrentTimestamp(),
	// 	self._clientContext.getClientCertHash()
	// );
	//
	// seekHeader = client_utils.buildHeader(signer, seekInfoHeader, txId.getNonce());
	// seekPayload = new _commonProto.Payload();
	// seekPayload.setHeader(seekHeader);
	// seekPayload.setData(seekInfo.toBuffer());
	//
	// // building manually or will get protobuf errors on send
	// envelope = client_utils.toEnvelope(client_utils.signProposal(signer, seekPayload));
	// // this will return us a block
	// block = await orderer.sendDeliver(envelope);
	// if (!block) {
	// 	throw new Error('Config block was not found');
	// }
	// // lets have a look at the block
	// logger.debug('%s -  config block number ::%s  -- numberof tx :: %s', method, block.header.number, block.data.data.length);
	// if (block.data.data.length !== 1) {
	// 	throw new Error('Config block must only contain one transaction');
	// }
	// envelope = _commonProto.Envelope.decode(block.data.data[0]);
	// const payload = _commonProto.Payload.decode(envelope.payload);
	// const channel_header = _commonProto.ChannelHeader.decode(payload.header.channel_header);
	// if (channel_header.type !== _commonProto.HeaderType.CONFIG) {
	// 	throw new Error(`Block must be of type "CONFIG" (${_commonProto.HeaderType.CONFIG}), but got "${channel_header.type}" instead`);
	// }
	//
	// const config_envelope = _configtxProto.ConfigEnvelope.decode(payload.data);
	//
	// // send back the envelope
	// return config_envelope;
};


/**
 * TODO WIP
 * @param {Client.Channel} channel
 * @param {Peer[]} peers
 * @param user
 * @param {Object} [block] genesis block
 * @param {Orderer} [orderer] required if block is not provided
 * @returns {Promise<*>}
 */
const join = async (channel, peers, user, block, orderer) => {
	logger.debug('join-channel', {channelName: channel.name, peer: peers.name});

	if (!block) {
		const eventBlock = await getGenesisBlock(channel, user, orderer);
		block = fromEvent({block: eventBlock}).toBuffer();
		logger.debug({block});
	}
	for (const peer of peers) {
		await peer.endorser.connect();
	}
	const identityContext = new IdentityContext(user, null);
	const proposal = new Proposal(identityContext, '');
	const result = await proposal.joinChannel(block, peers.map(({endorser}) => endorser));

	const {errors, responses} = result;

	for (const {response} of responses) {
		logger.debug(response);
	}


	return result;


	// const data = await channel.joinChannel(request);
	// const joinedBeforeSymptom = 'LedgerID already exists';
	// const dataEntry = data[0];
	//
	// if (dataEntry instanceof Error) {
	// 	logger.warn('join-channel', dataEntry);
	// 	const errMessage = dataEntry.message;
	// 	const swallowSymptoms = ['NOT_FOUND', 'Stream removed'];
	//
	// 	if (swallowSymptoms.map((symptom) => errMessage.includes(symptom)).find((isMatched) => !!isMatched) && waitTime) {
	// 		logger.warn('join-channel', 'loopJoinChannel...', errMessage);
	// 		await sleep(waitTime);
	// 		return await join(channel, peers, block, orderer, waitTime);
	// 	}
	// 	if (errMessage.includes(joinedBeforeSymptom)) {
	// 		// swallow 'joined before' error
	// 		logger.info('join-channel', 'peer joined before', peers.getName());
	// 		return;
	// 	}
	// 	throw dataEntry;
	// }
	//
	// const {response: {status, message}} = dataEntry;
	// if (status !== 200) {
	// 	throw Error(JSON.stringify({status, message}));
	// }
	// return dataEntry;

};

module.exports = {
	getGenesisBlock,
	getChannelConfigFromOrderer,
	create,
	join
};

