const Proposal = require('fabric-common/lib/Proposal');
const ChannelManager = require('./channel');
const Commit = require('fabric-common/lib/Commit');

class ProposalManager extends Proposal {

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param channelName
	 * @param [chaincodeId]
	 * @param [peers]
	 */
	constructor(identityContext, channelName, chaincodeId, peers) {
		super(chaincodeId || null, ChannelManager.emptyChannel(channelName));
		this.identityContext = identityContext;
		if (Array.isArray(peers)) {
			this.targets = peers.map(({endorser}) => endorser);
		}
	}

	asQuery() {
		this.type = 'Query';
	}

	/**
	 *
	 * @param {BuildProposalRequest} buildProposalRequest
	 * @param {{requestTimeout:number,targets:Endorser[]}} extraOptions
	 * @return {*}
	 */
	async send(buildProposalRequest, extraOptions = {}) {
		const requestTimeout = extraOptions.requestTimeout || this.requestTimeout;
		const targets = extraOptions.targets || this.targets;

		const {identityContext} = this;

		this.build(identityContext, buildProposalRequest);
		this.sign(identityContext); // TODO take care of offline signing
		/**
		 * @type {SendProposalRequest}
		 */
		const sendProposalRequest = {
			targets,
			requestTimeout
		};
		return super.send(sendProposalRequest);
	}

	newCommit() {
		return new Commit(this.chaincodeId, this.channel, this);
	}

	/**
	 *
	 * @param {Committers[]} targets
	 * @param [requestTimeout]
	 */
	async commit(targets, requestTimeout) {
		const commit = this.newCommit();

		commit.build(this.identityContext);
		commit.sign(this.identityContext);

		const result = await commit.send({targets, requestTimeout});
		console.debug(result);
		return result;
	}

}

module.exports = ProposalManager;