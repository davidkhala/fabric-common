const proposalStringify = (proposalResponse) => {
	if (!(proposalResponse instanceof Error)) {
		proposalResponse.response.payload = proposalResponse.response.payload.toString();
	}
	return proposalResponse;
};
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