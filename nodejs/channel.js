const util = require('util');
const logger = require('./logger').new('channel');
/**
 * New feature introduced from 1.1.0-alpha
 */
exports.newEventHub = (channel, peer) => {
	channel.newChannelEventHub(peer);
};
exports.nameMatcher = (channelName, toThrow) => {
	const namePattern = /^[a-z][a-z0-9.-]*$/;//TODO in fabric 1.2: we could test with new Channel()
	const result = channelName.match(namePattern);
	if (!result && toThrow) {
		throw new Error(util.format('Failed to create Channel. channel name should match Regex %s, but got %j', namePattern, channelName));
	}
	return result;
};
exports.new = (client,channelName)=>{

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
