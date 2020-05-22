exports.nameMatcher = (chaincodeName, toThrow) => {
	const namePattern = /^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/;
	const result = chaincodeName.match(namePattern);
	if (!result && toThrow) {
		throw Error(`invalid chaincode name:${chaincodeName}; should match regx: ${namePattern}`);
	}
	return result;
};
exports.versionMatcher = (ccVersionName, toThrow) => {
	const namePattern = /^[A-Za-z0-9_.+-]+$/;
	const result = ccVersionName.match(namePattern);
	if (!result && toThrow) {
		throw Error(`invalid chaincode version:${ccVersionName}; should match regx: ${namePattern}`);
	}
	return result;
};

exports.collectionMatcher = (collectionName, toThrow) => {
	const namePattern = /^[A-Za-z0-9-]+([A-Za-z0-9_-]+)*$/;
	const result = collectionName.match(namePattern);
	if (!result && toThrow) {
		throw Error(`invalid collection name:[${collectionName}] should match regx: ${namePattern}`);
	}
	return result;
};

/**
 * @enum {string}
 */
const ChaincodeType = {
	golang: 'golang',
	node: 'node',
	java: 'java'
};
exports.ChaincodeType = ChaincodeType;