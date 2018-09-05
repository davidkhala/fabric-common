const logger = require('./logger').new('channel');
const fs = require('fs');
const {signs} = require('./multiSign');
exports.setClientContext = (channel, clientContext) => {
	channel._clientContext = clientContext;
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

	delete client._channels[channelName];//Always renew, otherwise throw exception if exist
	return client.newChannel(channelName);
};
/**
 * FIXME This should be deprecated in 1.3
 * @param client
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
	logger.debug('channel created', {status,info},results);
	if (status === 'SUCCESS') return results;
	else throw results;
};


/**
 * to be atomic, join 1 peer each time
 * @param channel
 * @param peer
 * @param orderer
 * @returns {Promise<*>}
 */
exports.join = async (channel, peer, orderer, waitTime) => {
	const logger = require('./logger').new('join-channel');
	logger.debug({channelName: channel.getName(), peer: peer._name});

	const channelClient = channel._clientContext;
	const genesis_block = await channel.getGenesisBlock({orderer});
	logger.debug('signature identity', channelClient.getUserContext().getName());
	const request = {
		targets: [peer],
		txId: channelClient.newTransactionID(),
		block: genesis_block
	};

	const data = await channel.joinChannel(request);
	const joinedBeforeSymptom = 'Cannot create ledger from genesis block, due to LedgerID already exists';
	const dataEntry = data[0];

	if (dataEntry instanceof Error) {
		if (waitTime && Number.isInteger(waitTime) && waitTime > 0) {
			const errString = dataEntry.toString();
			if (errString.includes('Invalid results returned ::NOT_FOUND') || errString.includes('UNAVAILABLE')) {
				logger.warn('loopJoinChannel...', errString);
				await new Promise(resolve => {
					setTimeout(() => {
						resolve(exports.join(channel, peer, orderer, waitTime));
					}, waitTime);
				});
			}
		} else throw dataEntry;
	}
	const {response: {status, message}} = dataEntry;
	if (status !== 200) {
		//swallow 'joined before' error
		if (message === joinedBeforeSymptom) {
			logger.info('peer joined before', peer._name);
			return;
		} else {
			throw {status, message};
		}
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
