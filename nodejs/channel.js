const util = require('util');
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
exports.genesis = 'testchainid';
