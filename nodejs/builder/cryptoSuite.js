const BaseClient = require('fabric-client/lib/BaseClient');
exports.emptySuite = () => {
	return BaseClient.newCryptoSuite();
};