const logger = require('./logger').new('chaincode');
exports.nextVersion = (chaincodeVersion) => {
	const version = parseInt(chaincodeVersion.substr(1));
	return `v${version + 1}`;
};
exports.reducer = ({txEventResponses, proposalResponses}) => ({
	txs: txEventResponses.map(entry => entry.tx),
	responses: proposalResponses.map((entry) => entry.response.payload.toString())
});


exports.resultWrapper = (result, {proposalResponses}) => ({
	txEventResponses: result,
	proposalResponses
});

exports.chaincodeProposalAdapter = (actionString, validator) => {
	const _validator = validator ? validator : ({response}) => {
		return {isValid: response && response.status === 200, isSwallowed: false};
	};
	return ([responses, proposal, header]) => {

		let errCounter = 0; // NOTE logic: reject only when all bad
		let swallowCounter = 0;
		for (const i in responses) {
			const proposalResponse = responses[i];
			const {isValid, isSwallowed} = _validator(proposalResponse);
			if (isValid) {
				logger.info(`${actionString} was good for [${i}]`, proposalResponse);
				if (isSwallowed) {
					swallowCounter++;
				}
			} else {
				logger.error(`${actionString} was bad for [${i}]`, proposalResponse);
				errCounter++;
			}
		}

		return {
			errCounter,
			swallowCounter,
			nextRequest: {
				proposalResponses: responses, proposal,
			},
		};

	};
};