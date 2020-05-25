const ChaincodeAction = require('./chaincodeAction');
const ProposalManager = require('khala-fabric-admin/proposal');
const {waitForTx} = require('./eventHub');

class Transaction extends ChaincodeAction {
	constructor(peers, user, channel, logger) {
		super(peers, user, channel);
		if (!logger) {
			logger = require('khala-logger/log4js').consoleLogger('Transaction');
		}
		this.logger = logger;
	}

	setProposalOptions(options) {
		this.proposalOptions = options;
	}

	setCommitOptions(options) {
		this.commitOptions = options;
	}

	setEventOptions(options) {
		this.eventOptions = options;
	}

	build(chaincodeId) {
		this.proposal = new ProposalManager(this.identityContext, this.channel, chaincodeId, this.endorsers);
	}

	async evaluate({fcn, args = [], transientMap}) {
		this.proposal.asQuery();
		return await this.proposal.send({fcn, args, transientMap}, this.proposalOptions);
	}

	async submit({fcn, args = [], transientMap, init}, orderer) {
		if (init) {
			fcn = 'init';
		}
		this.proposal.asEndorsement();
		const result = await this.proposal.send({fcn, args, transientMap, init}, this.proposalOptions);
		const commitResult = await this.proposal.commit([orderer.committer], this.commitOptions);
		this.logger.debug(commitResult);
		const eventHub = this.newEventHub(this.eventOptions);
		await waitForTx(eventHub, this.proposal.identityContext);
		eventHub.disconnect();
		return result;

	}
}

module.exports = Transaction;