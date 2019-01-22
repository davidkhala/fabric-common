const BaseClient = require('fabric-client/lib/BaseClient');
const Client = require('fabric-client');
const path = require('path');
const {fsExtra} = require('khala-nodeutils/helper');
const logger = require('./logger').new('client', true);

const {cryptoKeyStore} = require('./package');
const cryptoKeyStorePath = path.resolve(__dirname, cryptoKeyStore);
fsExtra.ensureDirSync(cryptoKeyStorePath);// TODO
const User = require('fabric-client/lib/User');
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
		if (!path) {
			path = cryptoKeyStorePath;
		}
		newCryptoSuite.setCryptoKeyStore(BaseClient.newCryptoKeyStore(undefined, {path}));
		logger.debug('cryptoKeystore cache files:', fsExtra.readdirSync(path).length);
	}

	return newCryptoSuite;
};
exports.clean = () => {
	fsExtra.emptyDirSync(cryptoKeyStorePath);
};
exports.getCryptoSuite = (client) => client.getCryptoSuite();

