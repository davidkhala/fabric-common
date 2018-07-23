const logger = require('./logger').new('channel');
const fs = require('fs');
const {signs} = require('./multiSign');
exports.setClientContext = (channel, clientContext) => {
	channel._clientContext = clientContext;
};

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
	} else {
		exports.nameMatcher(channelName, true);
	}

	delete client._channels[channelName];//Always renew, otherwise throw exception if exist
	return client.newChannel(channelName);
};
exports.genesis = 'testchainid';

/**
 *
 * @param {Promise<Client>[]} signClients
 * @param {Channel} channel
 * @param {string} channelConfigFile file path
 * @param {Orderer} orderer
 * @returns {PromiseLike<T> | Promise<T>}
 */
exports.create = async (signClients, channel, channelConfigFile, orderer) => {
	const logger = require('./logger').new('create-channel');
	const channelName = channel.getName();
	logger.debug({channelName, channelConfigFile});

	const channelClient = channel._clientContext;
	const channelConfig_envelop = fs.readFileSync(channelConfigFile);

	// extract the channel config bytes from the envelope to be signed
	const channelConfig = channelClient.extractChannelConfig(channelConfig_envelop);
	const {signatures} = await signs(signClients, channelConfig);
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
	logger.debug('channel created', results);
	const {status, info} = results;
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
exports.join = async (channel, peer, orderer) => {
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

	if(dataEntry instanceof Error){
		throw dataEntry;
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