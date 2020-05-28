exports.genesis = 'testchainid';
/**
 * @param {string} channelName
 * @param {boolean} [toThrow]
 */
exports.nameMatcher = (channelName, toThrow) => {
	const namePattern = /^[a-z][a-z0-9.-]*$/;
	const result = channelName.match(namePattern) && channelName.length < 250;
	if (!result && toThrow) {
		throw Error(`invalid channel name ${channelName}; should match regx: ${namePattern} and with length < 250`);
	}
	return result;
};

exports.configGroupMatcher = (configGroupName, toThrow) => {
	const namePattern = /^[a-zA-Z0-9.-]+$/;
	const result = configGroupName.match(namePattern) && configGroupName.length < 250;
	if (!result && toThrow) {
		throw Error(`invalid config group name [${configGroupName}] should match regx: ${namePattern} and with length < 250`);
	}
	return result;
};

exports.mspIdMatcher = (mspId) => {
	const namePattern = /^[a-zA-Z0-9.-]+$/;
	return mspId.match(namePattern);

};