const Channel = require('fabric-common/lib/Channel');

module.exports = {
	emptyChannel: (channelName) => {
		const client = {
			getClientCertHash: () => Buffer.from(''),
			getConfigSetting: () => undefined
		};
		return new Channel(channelName, client);
	}
};
