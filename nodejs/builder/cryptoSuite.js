const BaseClient = require('fabric-client/lib/BaseClient');
/**
 *
 * @return {Client.ICryptoSuite}
 */
exports.emptySuite = () => {
	return BaseClient.newCryptoSuite();
};