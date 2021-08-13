const QSCCProposal = require('khala-fabric-admin/QSCCProposal');
const CSCCProposal = require('khala-fabric-admin/CSCCProposal');
const fabprotos = require('fabric-protos');
const protosProto = fabprotos.protos;
const commonProto = fabprotos.common;
const LifecycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {emptyChannel} = require('khala-fabric-admin/channel');
const BlockDecoder = require('fabric-common/lib/BlockDecoder');
const IdentityContext = require('fabric-common/lib/IdentityContext');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');
const ChaincodeAction = require('./chaincodeAction');

class QueryHub extends ChaincodeAction {
	constructor(peers, user) {
		super(peers, user, undefined);
		this.identityContext = new IdentityContext(user, null);
	}

	async getChainInfo(channelName) {
		const channel = emptyChannel(channelName);
		const proposal = new QSCCProposal(this.identityContext, channel, this.endorsers);
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

	/**
	 *
	 * @param {string} [label] label name filter
	 * @param {string} [packageId] exact name search
	 */
	async chaincodesInstalled(label, packageId) {
		const lifecycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(''), this.endorsers);
		const result = await lifecycleProposal.queryInstalledChaincodes(packageId);
		if (!label || !!packageId) {
			return result.queryResults;
		} else {
			return result.queryResults.map((entry) => {
				const returned = {};
				for (const _packageId in entry) {
					if (_packageId.startsWith(label)) {
						returned[_packageId] = entry[_packageId];
					}
				}
				return returned;
			});
		}

	}

	async chaincodesInstantiated(channelName) {
		const lifecycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(channelName), this.endorsers);
		const result = await lifecycleProposal.queryChaincodeDefinition();
		return result.queryResults;
	}

	async blockFromHash(channelName, hashHex) {
		const blockHash = Buffer.from(hashHex, 'hex');
		const qsccProposal = new QSCCProposal(this.identityContext, emptyChannel(channelName), this.endorsers);
		const result = await qsccProposal.queryBlockByHash(blockHash);
		const {queryResults} = result;
		return queryResults.map(payload => BlockDecoder.decode(payload));
	}

	async blockFromHeight(channelName, blockNumber) {
		const proposal = new QSCCProposal(this.identityContext, emptyChannel(channelName), this.endorsers);
		const result = await proposal.queryBlock(blockNumber);
		const {queryResults} = result;
		return queryResults.map(payload => BlockDecoder.decode(payload));
	}

	async channelJoined() {
		const csccProposal = new CSCCProposal(this.identityContext, this.endorsers);

		const result = await csccProposal.queryChannels();

		return getResponses(result).map((response) => {
			const channelQueryResponse = protosProto.ChannelQueryResponse.decode(response.payload);
			return channelQueryResponse.channels.map(({channel_id}) => channel_id);
		});

	}

	async tx(channelName, txId) {
		const qsccProposal = new QSCCProposal(this.identityContext, emptyChannel(channelName), this.endorsers);

		const TxNotFound = (result) => {
			const {errors, responses} = result;
			if (errors.length > 0) {
				const err = Error('SYSTEM_ERROR');
				err.errors = errors;
				throw err;
			}

			const endorsementErrors = [];
			for (const Response of responses) {
				const {response, connection} = Response;
				if (response.status !== 200) {
					endorsementErrors.push({response, connection});
				}

			}
			if (endorsementErrors.length > 0) {

				const err = Error('ENDORSE_ERROR');
				let notFoundCounter = 0;
				const NotFoundSymptom = `Failed to get transaction with id ${txId}, error no such transaction ID [${txId}] in index`;
				err.errors = endorsementErrors.reduce((sum, {response, connection}) => {
					delete response.payload;
					sum[connection.url] = response;

					if (response.status === 500 &&
						response.message === NotFoundSymptom) {
						notFoundCounter++;
					}
					return sum;
				}, {});
				if (notFoundCounter === endorsementErrors.length) {
					result.NotFound = true;
					return result;
				} else {
					throw err;
				}

			}
			return result;
		};
		qsccProposal.setProposalResultAssert(TxNotFound);
		const result = await qsccProposal.queryTransaction(txId);
		const {queryResults, NotFound} = result;
		if (NotFound) {
			return [];
		}
		return queryResults.map(BlockDecoder.decodeTransaction);
	}
}

module.exports = QueryHub;
