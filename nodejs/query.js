
const QSCCProposal = require('khala-fabric-admin/QSCCProposal');
const CSCCProposal = require('khala-fabric-admin/CSCCProposal');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');
const fabricProtos = require('fabric-protos');
const protosProto = fabricProtos.protos;
const commonProto = fabricProtos.common;

exports.chain = async (peers, identityContext, channelName) => {
	const proposal = new QSCCProposal(identityContext, channelName, peers);
	const result = await proposal.queryInfo();

	const responses = getResponses(result);

	responses.forEach((response, index) => {
		const {height, currentBlockHash, previousBlockHash} = commonProto.BlockchainInfo.decode(response.payload);

		Object.assign(response, {
			height: height.toInt(),
			currentBlockHash: currentBlockHash.toString('hex'),
			previousBlockHash: previousBlockHash.toString('hex'),
			peer: peers[index].toString()
		});
	});

	return result;
};
/**
 * TODO
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
 * TODO
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
/**
 * TODO
 * @param peer
 * @param channel
 * @param hashHex
 * @return {Promise<*>}
 */
exports.blockFromHash = async (peer, channel, hashHex) => channel.queryBlockByHash(Buffer.from(hashHex, 'hex'), peer);
/**
 *
 * @param peers
 * @param identityContext
 * @param channelName
 * @param blockNumber
 * @return {Promise<*>}
 */
exports.blockFromHeight = async (peers, identityContext, channelName, blockNumber) => {
	const proposal = new QSCCProposal(identityContext, channelName, peers);
	return await proposal.queryBlock(blockNumber);
};

exports.channelJoined = async (peers, identityContext) => {
	const proposal = new CSCCProposal(identityContext, '', peers);

	const result = await proposal.queryChannels();

	const responses = getResponses(result);
	responses.forEach((response, index) => {
		const queryTrans = protosProto.ChannelQueryResponse.decode(response.payload);
		response.channels = queryTrans.channels.map(({channel_id}) => channel_id);
		response.peer = peers[index].toString();
	});

	return result;

};
/**
 * TODO
 * @param peer
 * @param channel
 * @param txId
 * @return {Promise<*>}
 */
exports.tx = async (peer, channel, txId) => channel.queryTransaction(txId, peer);
