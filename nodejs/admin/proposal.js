import Proposal from 'fabric-common/lib/Proposal.js';
import Commit from 'fabric-common/lib/Commit.js';
import UserBuilder from './user.js';
import assert from 'assert';

const {calculateTransactionId} = UserBuilder;
/**
 * A copy of sdk's definition of ProposalResponse
 * @typedef {Object} ProposalResponse
 * @property {ServiceError[]} errors
 * @property {EndorsementResponse[]} responses
 * @property {Buffer[]} queryResults
 */


/**
 * @typedef {Object} BuildProposalRequest
 * @property {string} [fcn] - Optional. The function name. May be used by
 * the chaincode to control the flow within the chaincode. Default 'invoke'
 * @property {string[]|Buffer[]} [args] - Optional. The arguments needed by the
 * chaincode execution. These should be strings or byte buffers.
 * These will be converted into byte buffers before building the protobuf
 * object to be sent to the fabric peer for endorsement.
 * @property {Map|Client.TransientMap} [transientMap] - Optional. A map with the key value pairs
 * of the transient data.
 * @property {boolean} [init] - Optional. If this proposal should be an
 * chaincode initialization request. This will set the init setting in the
 * protobuf object sent to the peer.
 * @property {boolean} [generateTransactionId] set false to avoid "idContext.calculateTransactionId()"
 * @property {Buffer} [nonce] if specify, random generated nonce will be overridden by this nonce
 */
export default class ProposalManager extends Proposal {

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param {Endorser[]} endorsers
	 * @param {string} [chaincodeId]
	 * @param {Channel} [channel]
	 */
	constructor(identityContext, endorsers, chaincodeId, channel) {
		super(chaincodeId || null, channel || null);
		Object.assign(this, {identityContext, endorsers});

	}

	/**
	 *
	 * @param {ProposalResultHandler} assertFunction
	 */
	set resultHandler(assertFunction) {
		assert.ok(typeof assertFunction === 'function');
		this.assertProposalResult = assertFunction;
	}

	/**
	 * @param {CommitResultHandler} assertFunction
	 */
	setCommitResultAssert(assertFunction) {
		this.assertCommitResult = assertFunction;
	}

	asQuery() {
		this.type = 'Query';
	}

	asEndorsement() {
		this.type = 'Endorsement';
	}

	set signingProcess(signCallback) {
		assert.ok(typeof signCallback === 'function');
		this.signFunction = signCallback;
	}

	/**
	 *
	 * @param {BuildProposalRequest} buildProposalRequest
	 * @param {{[requestTimeout]:number, [handler]:function}} [connectOptions]
	 * @return ProposalResponse
	 */
	async send(buildProposalRequest, connectOptions = {}) {
		const {requestTimeout} = connectOptions;

		const {identityContext} = this;
		const {nonce} = buildProposalRequest;
		if (nonce) {
			buildProposalRequest.generateTransactionId = false;
			identityContext.nonce = nonce;
			identityContext.transactionId = calculateTransactionId(identityContext, nonce);
		}
		this.build(identityContext, buildProposalRequest);
		if (this.signFunction) {
			// take care of offline signing
			const signature = await this.signFunction(this._payload);
			this.sign(signature);
		} else {
			this.sign(identityContext);
		}

		/**
		 * @type {SendProposalRequest}
		 */
		const sendProposalRequest = {
			targets: this.endorsers,
			requestTimeout,
		};
		const results = await super.send(sendProposalRequest);
		typeof this.assertProposalResult === 'function' && this.assertProposalResult(results);
		return results;
	}

	/**
	 *
	 * @param {Committer[]} committers
	 * @param [requestTimeout]
	 * @return Promise<CommitResponse|*>
	 */
	async commit(committers, {requestTimeout} = {}) {
		const {identityContext} = this;
		const commit = new Commit(this.chaincodeId, this.channel, this);

		commit.build(identityContext);

		if (this.signFunction) {
			// take care of offline signing
			const signature = await this.signFunction(commit._payload);
			commit.sign(signature);
		} else {
			commit.sign(identityContext);
		}

		const result = await commit.send({targets: committers, requestTimeout});
		if (typeof this.assertCommitResult === 'function') {
			return this.assertCommitResult(result);
		}

		return result;
	}

}
