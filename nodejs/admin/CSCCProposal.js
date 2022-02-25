import ProposalManager from './proposal.js';
const {SystemChaincodeID: {CSCC}} = require('khala-fabric-formatter/constants');
const {SystemChaincodeFunctions: {cscc: {JoinChain, GetChannels}}} = require('khala-fabric-formatter/systemChaincode');

const {EndorseALL} = require('./resultInterceptors');

export default class CSCCProposal extends ProposalManager {
	constructor(identityContext, endorsers) {
		super(identityContext, endorsers, CSCC);
		this.setProposalResultAssert(EndorseALL);
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

		return this.send(buildProposalRequest);
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
		return this.send(buildProposalRequest);
	}
}
