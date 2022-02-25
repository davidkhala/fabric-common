const {CommonResponseStatus: {SUCCESS}} = require('khala-fabric-formatter/constants');
/**
 * @typedef {function(result:ProposalResponse):ProposalResponse} ProposalResultHandler
 */
/**
 * @typedef {function(result:CommitResponse):CommitResponse} CommitResultHandler
 */

/**
 *
 * @type ProposalResultHandler
 */
export const EndorseALL = (result) => {
	const {errors, responses} = result;
	if (errors.length > 0) {
		const err = Error('SYSTEM_ERROR');
		err.errors = errors;
		throw err;
	}

	const endorsementErrors = [];
	for (const Response of responses) {
		const {response, connection} = Response;
		if (response.status !== 200) {
			endorsementErrors.push({response, connection});
		}

	}
	if (endorsementErrors.length > 0) {
		const err = Error('ENDORSE_ERROR');
		err.errors = endorsementErrors.reduce((sum, {response, connection}) => {
			delete response.payload;
			sum[connection.url] = response;
			return sum;
		}, {});
		throw err;
	}
	return result;
};

/**
 *
 * @param {CommitResponse} result
 *
 */
export const CommitSuccess = (result) => {
	const {status, info} = result;
	if (status === SUCCESS && info === '') {
		return result;
	}

	const err = Error('COMMIT_ERROR');
	Object.assign(err, {status, info});
	throw err;
};
