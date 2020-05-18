const Proposal = require('./proposal');
const {SystemChaincodeID: {CSCC}, SystemChaincodeFunctions: {cscc: {JoinChain, GetChannels}}} = require('khala-fabric-formatter/systemChaincode');

class CSCCProposal extends Proposal {
	constructor(identityContext, channelName, peers, requestTimeout) {
		super(identityContext, channelName, CSCC, peers, requestTimeout);
	}

	/**
	 * @param {Buffer} blockBuffer
	 */
	async joinChannel(blockBuffer) {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: JoinChain,
			args: [blockBuffer],
		};

		return await this.send(buildProposalRequest);
	}

	/**
	 * Query the names of all the channels each peer has joined.
	 */
	async queryChannels() {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetChannels,
			args: [],
		};
		return await this.send(buildProposalRequest);

	}
}

module.exports = CSCCProposal;