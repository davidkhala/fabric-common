import {consoleLogger} from '@davidkhala/logger/log4.js';
import SigningIdentityUtil from 'khala-fabric-admin/signingIdentity.js';
import {
	extractLastConfigIndex,
	assertConfigBlock,
	extractConfigEnvelopeFromBlockData
} from 'khala-fabric-formatter/protoTranslator.js';
import IdentityContext from 'fabric-common/lib/IdentityContext.js';
import EventHub from 'khala-fabric-admin/eventHub.js';
import {fromEvent} from 'khala-fabric-formatter/blockEncoder.js';
import {BlockNumberFilterType} from 'khala-fabric-formatter/eventHub.js';
import EventHubQuery from './eventHub.js';
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
