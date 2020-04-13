/**
 * TODO payload  protobuf deserialize
 * @param {Client.ProposalResponse} proposalResponse
 * @return {Client.ProposalResponse}
 */
const proposalStringify = (proposalResponse) => {
	if (!(proposalResponse instanceof Error)) {
		proposalResponse.response.payload = proposalResponse.response.payload.toString();
	}
	return proposalResponse;
};
/**
 *
 * @param proposalResponse
 * @return {string|Buffer}
 */
const proposalFlatten = proposalResponse => {
	if (proposalResponse instanceof Error) {
		return proposalResponse.message;
	} else {
		return proposalResponse.response.payload;
	}
};

exports.getPayloads = ({proposalResponses}) => {
	return proposalResponses.map((entry) => proposalFlatten(proposalStringify(entry)));
};
exports.proposalStringify = proposalStringify;
exports.proposalFlatten = proposalFlatten;

/**
 *
 * @param {object} jsObject
 * @return {Client.TransientMap}
 */
exports.transientMapTransform = (jsObject) => {
	if (!jsObject) {
		return null;
	}
	const result = {};
	for (const [key, value] of Object.entries(jsObject)) {
		result[key] = Buffer.from(value);
	}
	return result;
};