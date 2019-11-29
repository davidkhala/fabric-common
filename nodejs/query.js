// TODO replace some with system chaincode
const Long = require('long');
/**
 *
 * @param {Client.Peer} peer
 * @param {Client.Channel} channel
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
 * @param {Client.Peer} peer
 * @param {Client} client
 * @return {Promise<Client.ChaincodeQueryResponse>}
 */
exports.chaincodesInstalled = async (peer, client) => {
	const {chaincodes} = await client.queryInstalledChaincodes(peer);
	const pretty = chaincodes.map(({name, version, path}) => ({name, version, path}));
	return {chaincodes, pretty};
};
/**
 * only one latest version entry for each chaincode, thus no need to findLast
 * @param {Client.Peer} peer
 * @param {Client.Channel} channel
 * @return {Promise<Client.ChaincodeQueryResponse>}
 */
exports.chaincodesInstantiated = async (peer, channel) => {
	const {chaincodes} = await channel.queryInstantiatedChaincodes(peer);
	const pretty = chaincodes.map(({name, version, path}) => ({name, version, path}));
	return {chaincodes, pretty};
};

exports.blockFromHash = async (peer, channel, hashHex) => channel.queryBlockByHash(Buffer.from(hashHex, 'hex'), peer);
exports.blockFromHeight = async (peer, channel, blockNumber) => channel.queryBlock(parseInt(blockNumber), peer);
exports.channelJoined = async (peer, client) => client.queryChannels(peer);

exports.tx = async (peer, channel, txId) => channel.queryTransaction(txId, peer);
