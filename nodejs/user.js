const fs = require('fs');
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
 * @param {Client.User} user
 * @param {Buffer} messageBytes
 * @return {Buffer}
 */
exports.sign = (user, messageBytes) => user.getSigningIdentity().sign(messageBytes, undefined);
