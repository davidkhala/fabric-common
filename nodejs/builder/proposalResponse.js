const ProtoLoader = require('./protobuf');

class ProposalResponseAnalyzer {
	constructor(node_modules, logger = console) {
		this.node_modules = node_modules;
		this.logger = logger;
		if (node_modules) {
			this.protoLoader = new ProtoLoader(node_modules);
			this._responseProto = this.protoLoader.require('peer', 'proposal_response.proto').protos;
			this._proposalProto = this.protoLoader.require('peer', 'proposal.proto').protos;
		}
	}

	verifyProposalResponse(proposal_response, cryptoSuite) {
		const IdentityProto = require('./Identity');
		const identityProto = new IdentityProto(this.node_modules);
		return identityProto.verifyProposalResponse(proposal_response, cryptoSuite);
	}

	getExtension(proposal_response) {
		const payload = this._responseProto.ProposalResponsePayload.decode(proposal_response.payload);
		const extension = this._proposalProto.ChaincodeAction.decode(payload.extension);
		return extension;
	}

	/**
	 * Utility method to examine a set of proposals to check they contain
	 * the same endorsement result write sets.
	 * This will validate that the endorsing peers all agree on the result
	 * of the chaincode execution.
	 * @param {Client.ProposalResponse[]} proposal_responses The proposal responses from all endorsing peers
	 * @return {boolean} True when all proposals compare equally, false otherwise.
	 */
	compareProposalResponseResults(proposal_responses) {
		if (!this.node_modules) {
			const {emptyChannel} = require('./channel');
			const channel = emptyChannel('void');
			return channel.compareProposalResponseResults(proposal_responses);
		} else {
			if (proposal_responses.some((response) => response instanceof Error)) {
				return false;
			}

			/**
			 * internal utility method to decode and get the write set from a proposal response
			 * @param proposal_response
			 * @return {Buffer | Promise<Buffer>}
			 */
			const getRWSet = (proposal_response) => {
				const extension = this.getExtension(proposal_response);
				// Note: we skipped validation on status of this action
				this.logger.debug(`_getWriteSet - chaincode action status:${extension.response.status} message:${extension.response.message}`);
				// return a buffer object which has an equals method
				return extension.results.toBuffer();
			};
			const first_one = getRWSet(proposal_responses[0]);
			for (let i = 1; i < proposal_responses.length; i++) {
				const next_one = getRWSet(proposal_responses[i]);
				if (next_one.equals(first_one)) {
					this.logger.debug(`compareProposalResponseResults - read/writes result sets match index=[${i}]`);
				} else {
					this.logger.error(`compareProposalResponseResults - read/writes result sets do not match index=[${i}]`);
					return false;
				}
			}

			return true;
		}
	}
}

module.exports = ProposalResponseAnalyzer;