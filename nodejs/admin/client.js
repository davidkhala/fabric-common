const Client = require('fabric-common/lib/Client');

class ClientManager {
	/**
	 *
	 * @param {Client} [client]
	 */
	constructor(client) {
		if (!client) {
			const name = null;
			client = new Client(name);
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