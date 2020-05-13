const Proposal = require('fabric-common/lib/Proposal');
const ChannelManager = require('./channel');
const {buildBlock} = require('./protoBuilder');
const {SystemChaincodeID: {CSCC}} = require('khala-fabric-formatter/constants');

class ProposalManager {

	constructor(chaincodeID, channel, channelName,) {
		if (!channel) {
			channel = ChannelManager.emptyChannel(channelName);
		}
		this.proposal = new Proposal(chaincodeID, channel);
	}


	/**
	 * TODO WIP
	 * @param {IdentityContext} identityContext
	 * @param block
	 * @param {Endorser[]} targets
	 */
	async joinChannel(identityContext, block, targets) {
		this.proposal.chaincodeId = CSCC;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'JoinChain',
			args: [buildBlock(block).toBuffer()],
		};
		this.proposal.build(identityContext, buildProposalRequest);
		this.proposal.sign(identityContext);
		/**
		 * @type {SendProposalRequest}
		 */
		const sendProposalRequest = {
			targets,
			requestTimeout: undefined
		};
		const result = await this.proposal.send(sendProposalRequest);

		return result;
	}
}

module.exports = ProposalManager;