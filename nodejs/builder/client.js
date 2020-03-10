const {emptySuite} = require('./cryptoSuite');
const Client = require('fabric-client');

class ClientManager {
	/**
	 *
	 * @param {Client} [client]
	 */
	constructor(client) {
		if (!client) {
			client = new Client();
			client.setCryptoSuite(emptySuite());
		}
		this.client = client;
	}

	setChannel(channelName, channel) {
		this.client._channels.set(channelName, channel);
	}

	deleteChannel(channelName) {
		this.client._channels.delete(channelName);
	}

	static setUser(client, user) {
		if (user && user.constructor.name === 'User') {
			client._userContext = user;
		} else {
			throw Error(`${user} is not instanceof User`);
		}
	}

	setUser(user) {
		ClientManager.setUser(this.client, user);
	}

	getUser() {
		return ClientManager.getUser(this.client);
	}

	static getUser(client) {
		return client._userContext;
	}
}

module.exports = ClientManager;