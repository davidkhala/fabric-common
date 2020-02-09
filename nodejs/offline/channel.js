const {emptyClient} = require('./client');
const Channel = require('fabric-client/lib/Channel');

exports.emptyChannel = (channelName) => {
	const client = emptyClient();
	return new Channel(channelName, client);
};