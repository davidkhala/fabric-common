const fs = require('fs');
const path = require('path');
const {findKeyFiles, findCertFiles} = require('khala-fabric-formatter/path');
const UserBuilder = require('khala-fabric-sdk-node-builder/user');

/**
 *
 * @param cryptoPath
 * @param {NodeType} nodeType
 * @param mspId
 * @param {boolean} [toThrow]
 * @returns {User}
 */
exports.loadFromLocal = (cryptoPath, nodeType, mspId, toThrow) => {
	const name = cryptoPath[`${nodeType}UserHostName`];
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) {
		if (toThrow) {
			throw Error(`User [${name}] from ${nodeType} organization [${mspId}] not found`);
		}
		return null;
	}
	const {keystore, signcerts} = exist;

	const builder = new UserBuilder({name});
	return builder.build({
		key: fs.readFileSync(keystore),
		certificate: fs.readFileSync(signcerts),
		mspId
	});
};
/**
 *
 * @param MSPConfigPath
 * @param name
 * @param mspId
 * @returns {User}
 */
exports.loadFrom = (MSPConfigPath, name, mspId) => {

	const builder = new UserBuilder({name});

	const keystore = findKeyFiles(path.resolve(MSPConfigPath, 'keystore'))[0];
	const signcert = findCertFiles(path.resolve(MSPConfigPath, 'signcerts'))[0];
	return builder.build({
		key: fs.readFileSync(keystore),
		certificate: fs.readFileSync(signcert),
		mspId
	});
};

/**
 *
 * @param {Client.User} user
 * @param {Buffer} messageBytes
 * @return {Buffer}
 */
exports.sign = (user, messageBytes) => user.getSigningIdentity().sign(messageBytes, undefined);
