const QSCCProposal = require('khala-fabric-admin/QSCCProposal');
const CSCCProposal = require('khala-fabric-admin/CSCCProposal');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');
const fabprotos = require('fabric-protos');
const protosProto = fabprotos.protos;
const commonProto = fabprotos.common;
const LifecycleProposal = require('khala-fabric-admin/lifecycleProposal');
const UserUtil = require('khala-fabric-admin/user');
const {emptyChannel} = require('khala-fabric-admin/channel');
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
		});
		result[index].peer = peers[index].toString();
	});

	return result;
};

exports.chaincodesInstalled = async (peers, user) => {
	for (const peer of peers) {
		await peer.connect();
	}
	const lifecycleProposal = new LifecycleProposal(UserUtil.getIdentityContext(user), emptyChannel(''), peers.map(({endorser}) => endorser));
	const result = await lifecycleProposal.queryInstalledChaincodes();
	return result.responses.map(({response}) => response.installed_chaincodes);
};

exports.chaincodesInstantiated = async (peer, channelName, user) => {
	await peer.connect();
	const lifecycleProposal = new LifecycleProposal(UserUtil.getIdentityContext(user), emptyChannel(channelName), [peer.endorser]);
	const result = await lifecycleProposal.queryChaincodeDefinition();
	return result.responses.map(({response}) => response.chaincode_definitions);
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
	const proposal = new CSCCProposal(identityContext, peers.map(({endorser}) => endorser));

	const result = await proposal.queryChannels();

	const responses = getResponses(result);
	responses.forEach((response, index) => {
		const channelQueryResponse = protosProto.ChannelQueryResponse.decode(response.payload);
		response.channels = channelQueryResponse.channels.map(({channel_id}) => channel_id);
		result.responses[index].peer = peers[index].toString();
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
