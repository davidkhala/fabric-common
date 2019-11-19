const BaseClient = require('fabric-client/lib/BaseClient');
const Client = require('fabric-client');
exports.emptyClient = () => {
	const client = new Client();
	const newCryptoSuite = BaseClient.newCryptoSuite();
	client.setCryptoSuite(newCryptoSuite);
	return client;
};