export function getResponses(result) {
	const {responses} = result;
	return responses.map(({response}) => response);
}