import ProposalManager from './proposal.js';
import {SystemChaincodeID} from 'khala-fabric-formatter/constants.js';
import {SystemChaincodeFunctions} from 'khala-fabric-formatter/systemChaincode.js';
import {emptyChannel} from './channel.js';
import {EndorseALL} from './resultInterceptors.js';

const {CSCC} = SystemChaincodeID;
const {cscc: {JoinChain, GetChannels}} = SystemChaincodeFunctions;

export default class CSCCProposal extends ProposalManager {
	constructor(identityContext, endorsers) {
		super(identityContext, endorsers, CSCC);
		this.setProposalResultAssert(EndorseALL);
	}

	/**
	 * @param {Buffer} blockBuffer
	 */
	async joinChannel(blockBuffer, channelName) {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: JoinChain,
			args: [blockBuffer],
		};

		this.channel = emptyChannel(channelName);// TODO workaround for missing this.channel
		const result = await this.send(buildProposalRequest);
		delete this.channel;
		return result;
	}

	/**
	 * Query the names of all the channels each peer has joined.
	 */
	async queryChannels() {
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: GetChannels,
			args: [],
		};
		return this.send(buildProposalRequest);
	}
}
