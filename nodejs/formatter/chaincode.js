exports.nameMatcher = (chaincodeName) => {
	const namePattern = /^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/;
	return chaincodeName.match(namePattern);
};
exports.versionMatcher = (ccVersionName) => {
	const namePattern = /^[A-Za-z0-9_.+-]+$/;
	return ccVersionName.match(namePattern);
};

exports.collectionMatcher = (collectionName) => {
	const namePattern = /^[A-Za-z0-9-]+([A-Za-z0-9_-]+)*$/;
	return collectionName.match(namePattern);
};
exports.packageFileMatcher = (packageFileName) => {
	const namePattern = /^(.+)[.]([0-9a-f]{64})[.]tar[.]gz$/;
	return packageFileName.match(namePattern);
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