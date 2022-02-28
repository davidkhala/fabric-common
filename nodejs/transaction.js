import ChaincodeAction from './chaincodeAction.js';
import ProposalManager from 'khala-fabric-admin/proposal.js';
import EventHubQuery from './eventHub.js';
import {transientMapTransform} from 'khala-fabric-formatter/txProposal.js';
import {EndorseALL, CommitSuccess} from 'khala-fabric-admin/resultInterceptors.js';

/**
 *
 */
export default class Transaction extends ChaincodeAction {
	/**
	 *
	 * @param peers
	 * @param user
	 * @param channel
	 * @param chaincodeId
	 * @param logger
	 */
	constructor(peers, user, channel, chaincodeId, logger = console) {
		super(peers, user, channel);

		const proposal = new ProposalManager(this.identityContext, this.endorsers, chaincodeId, this.channel);
		proposal.setProposalResultAssert(EndorseALL);
		proposal.setCommitResultAssert(CommitSuccess);
		Object.assign(this, {logger, proposal});
	}

	async evaluate({fcn, args = [], transientMap, nonce}) {
		this.proposal.asQuery();
		return this.proposal.send({
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
				const eventHubQuery = new EventHubQuery(eventHub, this.proposal.identityContext);
				await eventHubQuery.waitForTx();
			} finally {
				eventHub.disconnect();
			}
		}

		return result;

	}
}
