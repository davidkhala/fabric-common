const Client = require('fabric-common/lib/Client');

class ClientManager {
	/**
	 *
	 * @param {Client} [client]
	 */
	constructor(client) {
		if (!client) {
			client = new Client(null);
		}
		this.client = client;
	}

	setChannel(channelName, channel) {
		this.client.channels.set(channelName, channel);
	}

	deleteChannel(channelName) {
		this.client.channels.delete(channelName);
	}
}

module.exports = ClientManager;