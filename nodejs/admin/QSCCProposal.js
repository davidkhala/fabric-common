const ProposalManager = require('./proposal');
const {SystemChaincodeID: {QSCC}, SystemChaincodeFunctions: {qscc: {GetBlockByNumber, GetChainInfo}}} = require('khala-fabric-formatter/systemChaincode');

class QSCCProposal extends ProposalManager {
	constructor(identityContext, channel, peers) {
		super(identityContext, channel, QSCC, peers);
		this.asQuery();
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
			args: [this.proposal.channel.name, blockNumber.toString()],
		};

		return await this.send(buildProposalRequest);
	}


	async queryInfo() {

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetChainInfo,
			args: [this.proposal.channel.name],
		};

		return await this.send(buildProposalRequest);
	}
}

module.exports = QSCCProposal;