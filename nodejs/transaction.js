const ChaincodeAction = require('./chaincodeAction');
const ProposalManager = require('khala-fabric-admin/proposal');
const {waitForTx} = require('./eventHub');
const {transientMapTransform} = require('khala-fabric-formatter/txProposal');

/**
 * @typedef {function(result:ProposalResponse):ProposalResponse} EndorseResultHandler
 */

/**
 *
 */
class Transaction extends ChaincodeAction {
	constructor(peers, user, channel,chaincodeId, logger) {
		super(peers, user, channel);
		if (!logger) {
			logger = require('khala-logger/log4js').consoleLogger('Transaction');
		}
		this.logger = logger;
		this.proposal = new ProposalManager(this.identityContext, this.channel, chaincodeId, this.endorsers);
	}

	async evaluate({fcn, args = [], transientMap}) {
		this.proposal.asQuery();
		const result = await this.proposal.send({
			fcn,
			args,
			transientMap: transientMapTransform(transientMap)
		}, this.proposalOptions);
		return this.endorseResultInterceptor(result);
	}

	async submit({fcn, args = [], transientMap, init}, orderer) {
		if (init) {
			fcn = 'init';
		}
		this.proposal.asEndorsement();
		const result = await this.proposal.send({
			fcn,
			args,
			transientMap: transientMapTransform(transientMap),
			init
		}, this.proposalOptions);
		this.endorseResultInterceptor(result);
		const commitResult = await this.proposal.commit([orderer.committer], this.commitOptions);
		this.logger.debug(commitResult);
		const eventHub = this.newEventHub();
		try {
			await waitForTx(eventHub, this.proposal.identityContext);
		} finally {
			eventHub.disconnect();
		}

		return result;

	}
}

module.exports = Transaction;
