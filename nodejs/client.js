import Client from 'fabric-common/lib/Client';

export default class ClientManager {
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
