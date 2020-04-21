const IdentityProto = require('./Identity');

class ProposalResponseValidator {

	static verifyProposalResponse(proposal_response, cryptoSuite, node_modules) {
		const identityProto = new IdentityProto(node_modules);
		return identityProto.verifyProposalResponse(proposal_response, cryptoSuite);
	}

	/**
	 * Utility method to examine a set of proposals to check they contain
	 * the same endorsement result write sets.
	 * This will validate that the endorsing peers all agree on the result
	 * of the chaincode execution.
	 * @param {Client.ProposalResponse[]} proposal_responses The proposal responses from all endorsing peers
	 * @param [node_modules]
	 * @param [logger]
	 * @return {boolean} True when all proposals compare equally, false otherwise.
	 */
	static compareProposalResponseResults(proposal_responses, node_modules, logger = console) {
		if (!node_modules) {
			const {emptyChannel} = require('./channel');
			const channel = emptyChannel('void');
			return channel.compareProposalResponseResults(proposal_responses);
		} else {
			if (proposal_responses.some((response) => response instanceof Error)) {
				return false;
			}
			const ProtoLoader = require('./protobuf');
			const protoLoader = new ProtoLoader(node_modules);
			const _responseProto = protoLoader.require('peer', 'proposal_response.proto').protos;
			const _proposalProto = protoLoader.require('peer', 'proposal.proto').protos;
			/**
			 * internal utility method to decode and get the write set from a proposal response
			 * @param proposal_response
			 * @return {Buffer | Promise<Buffer>}
			 */
			const getRWSet = (proposal_response) => {

				const payload = _responseProto.ProposalResponsePayload.decode(proposal_response.payload);
				const extension = _proposalProto.ChaincodeAction.decode(payload.extension);
				// Note: we skipped validation on status of this action
				logger.debug(`_getWriteSet - chaincode action status:${extension.response.status} message:${extension.response.message}`);
				// return a buffer object which has an equals method
				return extension.results.toBuffer();
			};
			const first_one = getRWSet(proposal_responses[0]);
			for (let i = 1; i < proposal_responses.length; i++) {
				const next_one = getRWSet(proposal_responses[i]);
				if (next_one.equals(first_one)) {
					logger.debug(`compareProposalResponseResults - read/writes result sets match index=[${i}]`);
				} else {
					logger.error(`compareProposalResponseResults - read/writes result sets do not match index=[${i}]`);
					return false;
				}
			}

			return true;
		}
	}
}

module.exports = ProposalResponseValidator;