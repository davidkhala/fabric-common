const Proposal = require('fabric-common/lib/Proposal');
const Commit = require('fabric-common/lib/Commit');

/**
 * @typedef {Object} BuildProposalRequest
 * @property {string} [fcn] - Optional. The function name. May be used by
 * the chaincode to control the flow within the chaincode. Default 'invoke'
 * @property {string[]} [args] - Optional. The arguments needed by the
 * chaincode execution. These should be strings or byte buffers.
 * These will be converted into byte buffers before building the protobuf
 * object to be sent to the fabric peer for endorsement.
 * @property {Map} [transientMap] - Optional. A map with the key value pairs
 * of the transient data.
 * @property {boolean} [init] - Optional. If this proposal should be an
 * chaincode initialization request. This will set the init setting in the
 * protobuf object sent to the peer.
 */
class ProposalManager extends Proposal {

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param {Channel} channel
	 * @param [chaincodeId]
	 * @param {Endorser[]} [endorsers] We could specify targets during {@link send}
	 */
	constructor(identityContext, channel, chaincodeId, endorsers) {
		super(chaincodeId || null, channel);
		this.identityContext = identityContext;
		if (Array.isArray(endorsers)) {
			this.targets = endorsers;
		}
	}

	asQuery() {
		this.type = 'Query';
	}

	asEndorsement() {
		this.type = 'Endorsement';
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

	/**
	 *
	 * @param {Committer[]} targets
	 * @param [requestTimeout]
	 */
	async commit(targets, {requestTimeout} = {}) {
		const commit = new Commit(this.chaincodeId, this.channel, this);

		commit.build(this.identityContext);
		commit.sign(this.identityContext);

		return await commit.send({targets, requestTimeout});
	}

}

module.exports = ProposalManager;
