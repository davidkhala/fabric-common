const QSCCProposal = require('khala-fabric-admin/QSCCProposal');
const CSCCProposal = require('khala-fabric-admin/CSCCProposal');
const fabprotos = require('fabric-protos');
const protosProto = fabprotos.protos;
const commonProto = fabprotos.common;
const LifecycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {emptyChannel} = require('khala-fabric-admin/channel');
const BlockDecoder = require('fabric-common/lib/BlockDecoder');
const IdentityContext = require('fabric-common/lib/IdentityContext');

class QueryHub {
	constructor(peers, user) {
		this.targets = peers.map(({endorser}) => endorser);
		this.identityContext = new IdentityContext(user, null);
	}

	async chain(channelName) {
		const channel = emptyChannel(channelName);
		const proposal = new QSCCProposal(this.identityContext, channel, this.targets);
		const result = await proposal.queryInfo();

		const {queryResults} = result;

		return queryResults.map((payload) => {
			const {height, currentBlockHash, previousBlockHash} = commonProto.BlockchainInfo.decode(payload);
			return {
				height: height.toInt(),
				currentBlockHash: currentBlockHash.toString('hex'),
				previousBlockHash: previousBlockHash.toString('hex'),
			};
		});
	}

	async chaincodesInstalled(packageId) {
		const lifecycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(''), this.targets);
		const result = await lifecycleProposal.queryInstalledChaincodes(packageId);
		return result.queryResults;
	}

	async chaincodesInstantiated(peers, identityContext, channelName) {
		const lifecycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(channelName), this.targets);
		const result = await lifecycleProposal.queryChaincodeDefinition();
		return result.queryResults;
	}

	async blockFromHash(channelName, hashHex) {
		const blockHash = Buffer.from(hashHex, 'hex');
		const qsccProposal = new QSCCProposal(this.identityContext, emptyChannel(channelName), this.targets);
		const result = await qsccProposal.queryBlockByHash(blockHash);
		const {queryResults} = result;
		return queryResults.map(payload => BlockDecoder.decode(payload));
	}

	async blockFromHeight(channelName, blockNumber) {
		const proposal = new QSCCProposal(this.identityContext, emptyChannel(channelName), this.targets);
		const result = await proposal.queryBlock(blockNumber);
		const {queryResults} = result;
		return queryResults.map(payload => BlockDecoder.decode(payload));
	}

	async channelJoined() {
		const csccProposal = new CSCCProposal(this.identityContext, this.targets);

		const result = await csccProposal.queryChannels();

		const {queryResults} = result;
		return queryResults.map((payload) => {
			const channelQueryResponse = protosProto.ChannelQueryResponse.decode(payload);
			return channelQueryResponse.channels.map(({channel_id}) => channel_id);
		});

	}

	//TODO test
	async tx(channelName, txId) {
		const qsccProposal = new QSCCProposal(this.identityContext, emptyChannel(channelName), this.targets);
		const result = await qsccProposal.queryTransaction(txId);
		const {queryResults} = result;
		return queryResults.map((payload) => {
			return BlockDecoder.decodeTransaction(payload);
		});
	}
}

module.exports = QueryHub;
