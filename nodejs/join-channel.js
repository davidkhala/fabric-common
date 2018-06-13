const logger = require('./logger').new('Join-Channel');
const EventHubUtil = require('./eventHub');

/**
 * to be atomic, join 1 peer each time
 * @param channel
 * @param peer
 * @param eventHub
 * @param orderer
 * @returns {Promise<*>}
 */
exports.joinChannel = async (channel, peer, eventHub, orderer) => {
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
