const getResponses = (result) => {
	const {responses} = result;
	return responses.map(({response}) => response);
};
module.exports = {
	getResponses
};