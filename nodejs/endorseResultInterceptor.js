const EndorseALL = (result) => {
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
		err.errors = endorsementErrors;
		throw err;
	}
	return result;
};
module.exports = {
	EndorseALL
};
