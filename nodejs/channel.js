import {consoleLogger} from '@davidkhala/logger/log4.js';
import fs from 'fs';
import assert from 'assert';
import SigningIdentityUtil from 'khala-fabric-admin/signingIdentity.js';
import {
	extractLastConfigIndex,
	assertConfigBlock,
	extractConfigEnvelopeFromBlockData
} from 'khala-fabric-formatter/protoTranslator.js';
import IdentityContext from 'fabric-common/lib/IdentityContext.js';
import EventHub from 'khala-fabric-admin/eventHub.js';
import EventHubQuery from './eventHub.js';
import CSCCProposal from 'khala-fabric-admin/CSCCProposal.js';
import {fromEvent} from 'khala-fabric-formatter/blockEncoder.js';
import {BlockNumberFilterType} from 'khala-fabric-formatter/eventHub.js';
const logger = consoleLogger('channel');
const {NEWEST} = BlockNumberFilterType;

/**
 *
 * @param channel
 * @param {Client.User} user
 * @param {Orderer} orderer
 * @param {boolean} [verbose]
 * @param [blockTime] wait x ms if block is still UNAVAILABLE, then retry
 * @return {Promise<Object|Buffer>} if !!verbose, it returns a decoded block object
 */
export const getGenesisBlock = async (channel, user, orderer, verbose, blockTime = 1000) => {

	const identityContext = new IdentityContext(user, null);

	let block;
	if (verbose) {
		// FIXME: this part is not covered in test
		const eventHub = new EventHub(channel, orderer.eventer);
		eventHub.build(identityContext, {startBlock: 0});
		const eventHubQuery = new EventHubQuery(eventHub, identityContext);
		await eventHub.connect();
		block = await eventHubQuery.getSingleBlock(0);
		await eventHub.disconnect();
	} else {
		const signingIdentityUtil = new SigningIdentityUtil(user._signingIdentity);
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
export const getChannelConfigFromOrderer = async (channelName, user, orderer) => {

	const identityContext = new IdentityContext(user, null);
	const signingIdentityUtil = new SigningIdentityUtil(user._signingIdentity);
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
 * @returns {Promise<ProposalResponse>}
 */
export const join = async (channel, peers, user, blockFile, orderer) => {
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
	assert.ok(errors.length === 0);
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
