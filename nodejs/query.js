const Long = require('long');
/**
 *
 * @param {Peer} peer
 * @param {Channel} channel
 * @returns {Promise<{height, currentBlockHash, previousBlockHash,pretty}>}
 */
exports.chain = async (peer, channel) => {
	const message = await channel.queryInfo(peer);

	const {height, currentBlockHash, previousBlockHash} = message;
	message.pretty = {
		height: new Long(height.low, height.high, height.unsigned).toInt(),
		currentBlockHash: currentBlockHash.toString('hex'),
		previousBlockHash: previousBlockHash.toString('hex')
	};
	// npm long:to parse{ low: 4, high: 0, unsigned: true }
	return message;
};
/**
 * @param peer
 * @param client
 * @return {Promise<Client.ChaincodeQueryResponse>}
 */
exports.chaincodesInstalled = async (peer, client) => client.queryInstalledChaincodes(peer);
/**
 * @param peer
 * @param channel
 * @return {Promise<Client.ChaincodeQueryResponse>}
 */
exports.chaincodesInstantiated = async (peer, channel) => channel.queryInstantiatedChaincodes(peer);

exports.blockFromHash = async (peer, channel, hashHex) => channel.queryBlockByHash(Buffer.from(hashHex, 'hex'), peer);
exports.blockFromHeight = async (peer, channel, blockNumber) => channel.queryBlock(parseInt(blockNumber), peer);
exports.channelJoined = async (peer, client) => client.queryChannels(peer);

exports.tx = async (peer, channel, txId) => channel.queryTransaction(txId, peer);
