const logger = require('khala-logger/log4js').consoleLogger('multi-signature');
/**
 * @param {Client[]} clients
 * @param {Buffer<binary>|[]byte} proto
 * @returns {Client.ConfigSignature[]} signatures
 */
exports.signChannelConfig = (clients, proto) => {
	const signatures = [];
	for (const client of clients) {
		logger.debug('signature identity', client._userContext.getName(), client._userContext._signingIdentity._mspId);
		signatures.push(client.signChannelConfig(proto));
	}
	return signatures;
};
