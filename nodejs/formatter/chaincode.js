const nameMatcher = (chaincodeName) => {
	const namePattern = /^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/;
	return chaincodeName.match(namePattern);
};
const versionMatcher = (ccVersionName) => {
	const namePattern = /^[A-Za-z0-9_.+-]+$/;
	return ccVersionName.match(namePattern);
};

const collectionMatcher = (collectionName) => {
	const namePattern = /^[A-Za-z0-9-]+([A-Za-z0-9_-]+)*$/;
	return collectionName.match(namePattern);
};
const packageFileMatcher = (packageFileName) => {
	const namePattern = /^(.+)[.]([0-9a-f]{64})[.]tar[.]gz$/;
	return packageFileName.match(namePattern);
};

/**
 * @enum
 */
const ChaincodeSpecType = {
	UNDEFINED: 0,
	GOLANG: 1,
	NODE: 2,
	CAR: 3,
	JAVA: 4,
};

/**
 * @enum {string}
 */
const ChaincodeType = {
	golang: 'golang',
	node: 'node',
	java: 'java'
};
module.exports = {
	ChaincodeType,
	ChaincodeSpecType,
	implicitCollection: (mspId) => `_implicit_org_${mspId}`,
	nameMatcher, collectionMatcher, versionMatcher, packageFileMatcher
};

