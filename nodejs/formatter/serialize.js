const ByteBuffer = require('bytebuffer');

/**
 * @typedef {Object} SerializedProposalResponse
 * @property {integer} version
 * @property {Date} timestamp
 * @property {{status:Client.Status, message:string, payload: hexString}} response
 * @property {hexString} payload
 * @property endorsement
 * @property {RemoteCharacteristics} peer
 */


const proposalOperate = {
	/**
	 *
	 * @param {Proposal} proposal
	 * @return {Proposal}
	 */
	deserialize: (proposal) => {
		const {header, payload, extension} = proposal;
		return {
			header: ByteBuffer.fromHex(header),
			payload: ByteBuffer.fromHex(payload),
			extension: ByteBuffer.fromHex(extension)
		};
	},
	/**
	 * @param {Proposal} proposal
	 */
	serialize: (proposal) => {

		const {header, payload, extension} = proposal;
		const bytes = proposal.toBuffer();

		return {
			bytes,
			proposal: {header: header.toHex(), payload: payload.toHex(), extension: extension.toHex()}
		};

	}
};

const proposalResponseOperate = {
	/**
	 *
	 * @param {SerializedProposalResponse} proposalResponse
	 * @return {ProposalResponse}
	 */
	deserialize: (proposalResponse) => {

		/**
		 * @type {ProposalResponse}
		 */
		const newItem = Object.assign({}, proposalResponse);
		newItem.response = Object.assign({}, proposalResponse.response);
		newItem.endorsement = Object.assign({}, proposalResponse.endorsement);
		const {response, endorsement} = newItem;
		response.payload = ByteBuffer.fromHex(response.payload);
		newItem.payload = ByteBuffer.fromHex(newItem.payload);
		endorsement.endorser = ByteBuffer.fromHex(endorsement.endorser);
		endorsement.signature = ByteBuffer.fromHex(endorsement.signature);
		return newItem;
	},
	/**
	 *
	 * @param {ProposalResponse} proposalResponse serialize will make it Buffer-less
	 * @return {SerializedProposalResponse}
	 */
	serialize: (proposalResponse) => {

		/**
		 * @type {SerializedProposalResponse}
		 */
		const newItem = Object.assign({}, proposalResponse);
		newItem.response = Object.assign({}, proposalResponse.response);
		newItem.endorsement = Object.assign({}, proposalResponse.endorsement);
		const {response, endorsement} = newItem;
		response.payload = response.payload.toString('hex');
		newItem.payload = newItem.payload.toString('hex');
		endorsement.endorser = endorsement.endorser.toString('hex');
		endorsement.signature = endorsement.signature.toString('hex');
		return newItem;
	},
};

const hex = {
	/**
	 * @param {Buffer} message
	 * @return {hexString}
	 */
	serialize: (message) => {
		return message.toString('hex');
	},
	/**
	 *
	 * @param {hexString} str
	 */
	deserialize: (str) => {
		return Buffer.from(str, 'hex');
	}
};

module.exports = {
	serializeToHex: hex.serialize,
	deserializeFromHex: hex.deserialize,
	deserializeProposalResponse: proposalResponseOperate.deserialize,
	serializeProposalResponse: proposalResponseOperate.serialize,
	serializeProposal: proposalOperate.serialize,
	deserializeProposal: proposalOperate.deserialize,
};

