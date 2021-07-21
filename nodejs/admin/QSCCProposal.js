const ProposalManager = require('./proposal');
const {
	SystemChaincodeFunctions: {
		qscc: {GetBlockByNumber, GetChainInfo, GetBlockByHash, GetTransactionByID}
	}
} = require('khala-fabric-formatter/systemChaincode');
const {SystemChaincodeID: {QSCC}} = require('khala-fabric-formatter/constants');
const {EndorseALL} = require('./resultInterceptors');

class QSCCProposal extends ProposalManager {
	constructor(identityContext, channel, endorsers) {
		super(identityContext, channel, QSCC, endorsers);
		this.asQuery();
		this.setProposalResultAssert(EndorseALL);
	}

	/**
	 * Block inside response.payload
	 * @param blockNumber
	 * @return {Promise<*>}
	 */
	async queryBlock(blockNumber) {

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetBlockByNumber,
			args: [this.channel.name, blockNumber.toString()],
		};

		return await this.send(buildProposalRequest);
	}

	async queryInfo() {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetChainInfo,
			args: [this.channel.name],
		};

		return await this.send(buildProposalRequest);
	}

	/**
	 *
	 * @param {Buffer} blockHash
	 */
	async queryBlockByHash(blockHash) {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetBlockByHash,
			args: [this.channel.name, blockHash],
		};
		return await this.send(buildProposalRequest);
	}

	async queryTransaction(tx_id) {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetTransactionByID,
			args: [this.channel.name, tx_id],
		};
		return await this.send(buildProposalRequest);
	}
}

module.exports = QSCCProposal;
