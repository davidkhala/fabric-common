const BaseClient = require('fabric-common/lib/BaseClient');
const Client = require('fabric-client');
const fs = require('fs');
const logger = require('./logger').new('client', true);

const User = require('fabric-common/lib/User');
exports.new = (persist) => {
	const client = new Client();
	const newCryptoSuite = exports.newCryptoSuite({persist});
	client.setCryptoSuite(newCryptoSuite);
	return client;
};
exports.setChannel = (client, channelName, channel) => {
	client._channels.set(channelName, channel);
};
exports.deleteChannel = (client, channelName) => {
	client._channels.delete(channelName);
};
exports.setUser = (client, user) => {
	if (user instanceof User) {
		client._userContext = user;
	} else {
		throw Error(`${user} is not instanceof User`);
	}

};
exports.getUser = (client) => {
	return client._userContext;
};
/**
 * configuration is set in package.json
 * @param path
 * @param ephemeral
 * @returns {Client.ICryptoSuite}
 */
exports.newCryptoSuite = ({path, persist} = {}) => {
	const newCryptoSuite = BaseClient.newCryptoSuite();
	if (persist) {
		newCryptoSuite.setCryptoKeyStore(BaseClient.newCryptoKeyStore(undefined, {path}));
		logger.debug('cryptoKeystore cache files:', fs.readdirSync(path).length);
	}

	return newCryptoSuite;
};

exports.getCryptoSuite = (client) => client.getCryptoSuite();
exports.FabricClient = Client;
