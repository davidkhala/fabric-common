const fs = require('fs');
const UserBuilder = require('khala-fabric-admin/user');

/**
 *
 * @param cryptoPath
 * @param {NodeType} nodeType
 * @param {MspId} mspid
 * @param {boolean} [toThrow]
 * @returns {User}
 */
exports.loadFromLocal = (cryptoPath, nodeType, mspid, toThrow) => {
	const name = cryptoPath[`${nodeType}UserHostName`];
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) {
		if (toThrow) {
			throw Error(`User [${name}] from ${nodeType} organization [${mspid}] not found`);
		}
		return null;
	}
	const {keystore, signcerts} = exist;

	const builder = new UserBuilder({name});
	return builder.build({
		key: fs.readFileSync(keystore),
		certificate: fs.readFileSync(signcerts),
		mspid
	});
};
