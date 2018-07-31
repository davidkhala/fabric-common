const BaseClient = require('fabric-client/lib/BaseClient');
const Client = require('fabric-client');
const path = require('path');
const fsExtra = require('fs-extra');
const logger = require('./logger').new('client');

const {cryptoKeyStore} = require('./package');
const cryptoKeyStorePath = path.resolve(__dirname, cryptoKeyStore);
fsExtra.ensureDirSync(cryptoKeyStorePath);
exports.new = (persist) => {
	const client = new Client();
	const newCryptoSuite = exports.newCryptoSuite({persist});
	client.setCryptoSuite(newCryptoSuite);
	return client;
};
/**
 * configuration is set in package.json
 * @param path
 * @param ephemeral
 * @returns {Client.ICryptoSuite}
 */
exports.newCryptoSuite = ({path, persist} = {}) => {
	const newCryptoSuite = BaseClient.newCryptoSuite();
	if (!persist) {
		logger.debug('ephemeral cryptoKeystore without cache storage');
	} else {
		if (!path) path = cryptoKeyStorePath;
		newCryptoSuite.setCryptoKeyStore(BaseClient.newCryptoKeyStore(undefined, {path}));
		logger.debug('cryptoKeystore cache files:', fsExtra.readdirSync(path).length);
	}

	return newCryptoSuite;
};
exports.clean = () => {
	fsExtra.emptyDirSync(cryptoKeyStorePath);
};