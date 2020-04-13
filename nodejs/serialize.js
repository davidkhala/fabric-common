const ByteBuffer = require('bytebuffer');
/**
 * @param {Proposal} proposal
 */
exports.serializeProposal = (proposal) => {

	const {header, payload, extension} = proposal;
	const bytes = proposal.toBuffer();

	return {
		bytes,
		proposal: {header: header.toHex(), payload: payload.toHex(), extension: extension.toHex()}
	};

};
/**
 *
 * @param {Proposal} proposal
 * @return {Proposal}
 */
exports.deserializeProposal = (proposal) => {
	const {header, payload, extension} = proposal;
	return {
		header: ByteBuffer.fromHex(header),
		payload: ByteBuffer.fromHex(payload),
		extension: ByteBuffer.fromHex(extension)
	};
};

/**
 * @typedef {Object} SerializedProposalResponse
 * @property {integer} version
 * @property {Date} timestamp
 * @property {{status:Client.Status, message:string, payload: hexString}} response
 * @property {hexString} payload
 * @property endorsement
 * @property {RemoteCharacteristics} peer
 */

/**
 *
 * @param {ProposalResponse} proposalResponse serialize will make it Buffer-less
 * @return {SerializedProposalResponse}
 */
exports.serializeProposalResponse = (proposalResponse) => {

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
};
/**
 *
 * @param {SerializedProposalResponse} proposalResponse
 * @return {ProposalResponse}
 */
exports.deserializeProposalResponse = (proposalResponse) => {

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
};


/**
 * @param {Buffer} message
 * @return {hexString}
 */
exports.serializeToHex = (message) => {
	return message.toString('hex');
};
/**
 *
 * @param {hexString} str
 */
exports.deserializeFromHex = (str) => {
	return Buffer.from(str, 'hex');
};
