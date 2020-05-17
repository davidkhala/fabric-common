const Proposal = require('fabric-common/lib/Proposal');
const ChannelManager = require('./channel');
const {SystemChaincodeID: {CSCC, QSCC}} = require('khala-fabric-formatter/systemChaincode');

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

	/**
	 * @param {Buffer} blockBuffer
	 */
	async joinChannel(blockBuffer) {
		this.proposal.chaincodeId = CSCC;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'JoinChain',
			args: [blockBuffer],
		};

		return await this.send(buildProposalRequest);
	}

	/**
	 * Query the names of all the channels each peer has joined.
	 */
	async queryChannels() {
		this.proposal.chaincodeId = CSCC;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'GetChannels',
			args: [],
		};
		return await this.send(buildProposalRequest);

	}

	/**
	 * Block inside response.payload
	 * @param channelName
	 * @param blockNumber
	 * @return {Promise<*>}
	 */
	async queryBlock(blockNumber) {
		this.proposal.chaincodeId = 'QSCC';

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'GetBlockByNumber',
			args: [this.proposal.channel.name, blockNumber.toString()],
		};

		return await this.send(buildProposalRequest);
	}


	async queryInfo() {
		this.proposal.chaincodeId = QSCC;

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'GetChainInfo',
			args: [this.proposal.channel.name],
		};

		return await this.send(buildProposalRequest);
	}
}

module.exports = ProposalManager;