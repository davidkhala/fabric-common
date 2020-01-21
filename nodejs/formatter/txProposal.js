exports.proposalStringify = (proposalResponse) => {
	if (!(proposalResponse instanceof Error)) {
		proposalResponse.response.payload = proposalResponse.response.payload.toString();
	}
	return proposalResponse;
};
exports.proposalFlatten = proposalResponse => {
	if (proposalResponse instanceof Error) {
		return proposalResponse.message;
	} else {
		return proposalResponse.response.payload;
	}
};