import fabprotos from 'fabric-protos';
import QSCCProposal from 'khala-fabric-admin/QSCCProposal.js';
import CSCCProposal from 'khala-fabric-admin/CSCCProposal.js';
import LifecycleProposal from 'khala-fabric-admin/lifecycleProposal.js';
import {emptyChannel} from 'khala-fabric-admin/channel.js';
import BlockDecoder from 'fabric-common/lib/BlockDecoder.js';
import IdentityContext from 'fabric-common/lib/IdentityContext.js';
import {getResponses} from 'khala-fabric-formatter/proposalResponse.js';
import ChaincodeAction from './chaincodeAction.js';

const protosProto = fabprotos.protos;
const commonProto = fabprotos.common;

export default class QueryHub extends ChaincodeAction {
	constructor(peers, user) {
		super(peers, user, undefined);
		this.identityContext = new IdentityContext(user, null);
	}

	async getChainInfo(channelName) {
		const channel = emptyChannel(channelName);
		const proposal = new QSCCProposal(this.identityContext, this.endorsers, channel);
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
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.endorsers, emptyChannel(''));
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
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.endorsers, emptyChannel(channelName));
		const result = await lifecycleProposal.queryChaincodeDefinition();
		return result.queryResults;
	}

	async blockFromHash(channelName, hashHex) {
		const blockHash = Buffer.from(hashHex, 'hex');
		const qsccProposal = new QSCCProposal(this.identityContext, this.endorsers, emptyChannel(channelName));
		const result = await qsccProposal.queryBlockByHash(blockHash);
		const {queryResults} = result;
		return queryResults.map(payload => BlockDecoder.decode(payload));
	}

	async blockFromHeight(channelName, blockNumber) {
		const proposal = new QSCCProposal(this.identityContext, this.endorsers, emptyChannel(channelName));
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
		const qsccProposal = new QSCCProposal(this.identityContext, this.endorsers, emptyChannel(channelName));

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
