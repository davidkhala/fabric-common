const Proposal = require('fabric-common/lib/Proposal');
const ChannelManager = require('./channel');
const {SystemChaincodeID: {CSCC}} = require('khala-fabric-formatter/constants');

class ProposalManager {

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param channelName
	 * @param [chaincodeId]
	 */
	constructor(identityContext, channelName, chaincodeId) {
		const channel = ChannelManager.emptyChannel(channelName);

		this.proposal = new Proposal(chaincodeId || null, channel);
		this.identityContext = identityContext;
	}


	/**
	 * TODO WIP
	 * @param {Buffer} blockBuffer
	 * @param {Endorser[]} targets
	 */
	async joinChannel(blockBuffer, targets) {
		this.proposal.chaincodeId = CSCC;
		const {identityContext} = this;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'JoinChain',
			args: [blockBuffer],
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

	/**
	 * Queries the target peer for the names of all the channels that a
	 * peer has joined.
	 *
	 * @param {Endorser[]} targets - The target peers to send the query
	 * @returns {Promise} A promise to return a {@link ChannelQueryResponse}
	 */
	async queryChannels(targets) {
		this.proposal.chaincodeId = CSCC;
		const {identityContext} = this;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: 'GetChannels',
			args: [],
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

		// const results = await Channel.sendTransactionProposal(request, '' /* special channel id */, this);
		// const responses = results[0];
		// if (responses && Array.isArray(responses)) {
		// 	// will only be one response as we are only querying one peer
		// 	if (responses.length > 1) {
		// 		throw Error('Too many results returned');
		// 	}
		// 	const response = responses[0];
		// 	if (response instanceof Error) {
		// 		throw response;
		// 	}
		// 	if (response.response) {
		// 		logger.debug('queryChannels - response status :: %d', response.response.status);
		// 		const queryTrans = _queryProto.ChannelQueryResponse.decode(response.response.payload);
		// 		logger.debug('queryChannels - ProcessedTransaction.channelInfo.length :: %s', queryTrans.channels.length);
		// 		for (const channel of queryTrans.channels) {
		// 			logger.debug('>>> channel id %s ', channel.channel_id);
		// 		}
		// 		return queryTrans;
		// 	}
		// 	// no idea what we have, lets fail it and send it back
		// 	throw Error(response);
		// }
		// throw Error('Payload results are missing from the query');
	}
}

module.exports = ProposalManager;