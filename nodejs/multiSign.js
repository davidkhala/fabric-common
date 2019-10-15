const logger = require('./logger').new('multi-signature');
/**
 * @param {Client[]} clients
 * @param {Buffer<binary>} proto
 * @returns {Client.ConfigSignature[]} signatures
 */
exports.signs = (clients, proto) => {
	const signatures = [];
	for (const client of clients) {
		logger.debug('signature identity', client._userContext.getName(), client._userContext._mspId);
		signatures.push(client.signChannelConfig(proto));
	}
	return signatures;
};