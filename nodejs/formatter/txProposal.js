/**
 *
 * @param {Client.ProposalResponse} proposalResponse
 * @return {string}
 */
const proposalFlatten = proposalResponse => {
	if (proposalResponse instanceof Error) {
		return proposalResponse.message;
	} else {
		return proposalResponse.response.payload.toString('utf8');
	}
};

exports.getPayloads = ({proposalResponses}) => {
	return proposalResponses.map((entry) => proposalFlatten(entry));
};
exports.proposalFlatten = proposalFlatten;

/**
 *
 * @param {TransientMap} jsObject
 * @return {Client.TransientMap|TransientMap}
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