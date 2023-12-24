import {CommonResponseStatus} from 'khala-fabric-formatter/constants.js';

const {SUCCESS} = CommonResponseStatus;

/**
 *
 * @param {ProposalResponse} result
 * @returns {EndorsementResponse[]}
 */
export const SanCheck = (result) => {
	const {errors, responses} = result;
	if (errors.length > 0) {
		const err = Error('SYSTEM_ERROR');
		err.errors = errors;
		throw err;
	}

	const endorsementResponses = [];
	for (const {response, connection} of responses) {
		if (response.status !== 200) {
			endorsementResponses.push({response, connection});
		}
	}
	return endorsementResponses;
};

/**
 *
 * @type ProposalResultHandler
 * @param result
 * @param {ErrorsFilter} [errorsFilter]
 */
export const EndorseALL = (result, errorsFilter) => {
	if (!errorsFilter) {
		errorsFilter = () => true;
	}
	const endorsementErrors = SanCheck(result).filter(errorsFilter);
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

/**
 * @typedef {function(result:ProposalResponse, ...Object):ProposalResponse} ProposalResultHandler
 */
/**
 * @typedef {function(result:CommitResponse):CommitResponse} CommitResultHandler
 */
/**
 * @typedef {function(EndorsementResponse):boolean} ErrorsFilter
 */