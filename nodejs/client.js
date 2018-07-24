const BaseClient = require('fabric-client/lib/BaseClient');
const Client = require('fabric-client');
const path = require('path');
const fsExtra = require('fs-extra');
const logger = require('./logger').new('client');

const {cryptoKeyStore} = require('./package');
const cryptoKeyStorePath = path.resolve(__dirname, cryptoKeyStore);
fsExtra.ensureDirSync(cryptoKeyStorePath);
/**
 * configuration is set in package.json
 * @returns {Client}
 */
exports.new = () => {
	const client = new Client();
	const newCryptoSuite = exports.newCryptoSuite();
	client.setCryptoSuite(newCryptoSuite);
	return client;
};
exports.newCryptoSuite = ({path} = {path: cryptoKeyStorePath}) => {
	const newCryptoSuite = BaseClient.newCryptoSuite();
	newCryptoSuite.setCryptoKeyStore(BaseClient.newCryptoKeyStore(undefined, {path}));
	logger.debug('cryptoKeystore cache files:', fsExtra.readdirSync(path).length);
	return newCryptoSuite;
};
exports.clean = () => {
	fsExtra.emptyDirSync(cryptoKeyStorePath);
};