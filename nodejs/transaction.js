const ChaincodeAction = require('./chaincodeAction');
const ProposalManager = require('khala-fabric-admin/proposal');
const {waitForTx} = require('./eventHub');
const {transientMapTransform} = require('khala-fabric-formatter/txProposal');
const {EndorseALL, CommitSuccess} = require('khala-fabric-admin/resultInterceptors');

/**
 *
 */
class Transaction extends ChaincodeAction {
	/**
	 *
	 * @param peers
	 * @param user
	 * @param channel
	 * @param chaincodeId
	 * @param logger
	 */
	constructor(peers, user, channel, chaincodeId, logger) {
		super(peers, user, channel);
		if (!logger) {
			logger = require('khala-logger/log4js').consoleLogger('Transaction');
		}

		const proposal = new ProposalManager(this.identityContext, this.channel, chaincodeId, this.endorsers);
		proposal.setProposalResultAssert(EndorseALL);
		proposal.setCommitResultAssert(CommitSuccess);
		Object.assign(this, {logger, proposal});
	}

	async evaluate({fcn, args = [], transientMap, nonce}) {
		this.proposal.asQuery();
		return await this.proposal.send({
			fcn,
			args,
			nonce,
			transientMap: transientMapTransform(transientMap)
		}, this.proposalOptions);
	}

	async submit({fcn, args = [], transientMap, init, nonce}, orderer, finalityRequired = true) {
		if (init) {
			fcn = 'init';
		}
		this.proposal.asEndorsement();
		const result = await this.proposal.send({
			fcn,
			args,
			transientMap: transientMapTransform(transientMap),
			init,
			nonce
		}, this.proposalOptions);
		await this.proposal.commit([orderer.committer], this.commitOptions);

		if (finalityRequired) {
			const eventHub = this.newEventHub();
			try {
				await waitForTx(eventHub, this.proposal.identityContext);
			} finally {
				eventHub.disconnect();
			}
		}

		return result;

	}
}

module.exports = Transaction;
