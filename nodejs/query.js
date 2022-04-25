import fabprotos from 'fabric-protos';
import QSCCProposal from 'khala-fabric-admin/QSCCProposal.js';
import CSCCProposal from 'khala-fabric-admin/CSCCProposal.js';
import LifecycleProposal from 'khala-fabric-admin/lifecycleProposal.js';
import {SanCheck} from 'khala-fabric-admin/resultInterceptors.js'
import {emptyChannel} from 'khala-fabric-admin/channel.js';
import BlockDecoder from 'fabric-common/lib/BlockDecoder.js';
import {getResponses} from 'khala-fabric-formatter/proposalResponse.js';
import ChaincodeAction from './chaincodeAction.js';
import assert from 'assert';
import fs from 'fs';
import {getGenesisBlock} from './channel.js';

const protosProto = fabprotos.protos;
const commonProto = fabprotos.common;

/**
 * @type ProposalResultHandler
 */
const TxNotFound = (result) => {
	const endorsementErrors = SanCheck(result)

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

export default class QueryHub extends ChaincodeAction {
	constructor(peers, user, logger = console) {
		super(peers, user, undefined);
		this.logger = logger;
	}

	async connect() {
		for (const endorser of this.endorsers) {
			await endorser.connect();
		}
	}

	async disconnect() {
		for (const endorser of this.endorsers) {
			await endorser.disconnect();
		}
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

	async join(block, channelName) {
		const {identityContext, logger, endorsers} = this;
		const proposal = new CSCCProposal(identityContext, endorsers);
		let result;
		try {
			result = await proposal.joinChannel(block);
		} catch (e) {
			if (e.message !== 'ENDORSE_ERROR') {
				throw e;
			}
			const {errors} = e;
			for (const [endpoint, {status, message}] of Object.entries(errors)) {
				if (status === 500 && message === `cannot create ledger from genesis block: ledger [${channelName}] already exists with state [ACTIVE]`) {
					logger.warn(`${endpoint} has joined channel [${channelName}] already`);
					continue;
				}
				throw e;
			}
			return;
		}


		const {errors, responses} = result;
		assert.ok(errors.length === 0);
		responses.forEach(({response}, index) => {
			const {status, message} = response;
			if (status === 200 && message === '') {
				logger.info(`${endorsers[index].toString()} join channel success`);
			} else {
				logger.error(`${endorsers[index].toString()}`, response);
			}
		});

		return result;
	}

	async joinWithFile(blockFile, channelName) {

		this.logger.info('getGenesisBlock from', blockFile);
		const block = fs.readFileSync(blockFile);
		return await this.join(block, channelName);
	}

	async joinWithFetch(channel, orderer, blockFetchUser) {
		this.logger.info('getGenesisBlock from', orderer.toString());
		const block = await getGenesisBlock(channel, blockFetchUser, orderer);
		return await this.join(block, channel.name);
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

		qsccProposal.resultHandler = TxNotFound;
		const result = await qsccProposal.queryTransaction(txId);
		const {queryResults, NotFound} = result;
		if (NotFound) {
			return [];
		}
		return queryResults.map(BlockDecoder.decodeTransaction);
	}
}
