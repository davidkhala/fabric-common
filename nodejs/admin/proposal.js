const Proposal = require('fabric-common/lib/Proposal');
const ChannelManager = require('./channel');


class ProposalManager {

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param channelName
	 * @param [chaincodeId]
	 * @param [peers]
	 * @param [requestTimeout]
	 */
	constructor(identityContext, channelName, chaincodeId, peers, requestTimeout) {
		const channel = ChannelManager.emptyChannel(channelName);
		this.proposal = new Proposal(chaincodeId || null, channel);
		this.identityContext = identityContext;
		this.requestTimeout = requestTimeout;
		if (Array.isArray(peers)) {
			this.targets = peers.map(({endorser}) => endorser);
		}
	}


	/**
	 *
	 * @param {BuildProposalRequest} buildProposalRequest
	 * @param {Endorser[]} [targets]
	 * @return {*}
	 */
	async send(buildProposalRequest, targets) {
		const {identityContext, requestTimeout} = this;

		this.proposal.build(identityContext, buildProposalRequest);
		this.proposal.sign(identityContext);// TODO take care of offline signing
		/**
		 * @type {SendProposalRequest}
		 */
		const sendProposalRequest = {
			targets: targets || this.targets,
			requestTimeout
		};
		return this.proposal.send(sendProposalRequest);
	}

}

module.exports = ProposalManager;