const fs = require('fs');
exports.formatUsername = (username, domain) => `${username}@${domain}`;
const UserBuilder = require('khala-fabric-sdk-node-builder/user');

/**
 *
 * @param cryptoPath
 * @param {NodeType} nodeType
 * @param mspId
 * @returns {User|void}
 */
exports.loadFromLocal = (cryptoPath, nodeType, mspId) => {
	const username = cryptoPath.userName;
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) {
		return;
	}
	const {keystore, signcerts} = exist;

	const builder = new UserBuilder(username);
	return builder.build({
		key: fs.readFileSync(keystore),
		certificate: fs.readFileSync(signcerts),
		mspId
	});
};

exports.getCertificate = (user) => user.getSigningIdentity()._certificate;
exports.getMSPID = (user) => user._mspId;
exports.getPrivateKey = (user) => user.getSigningIdentity()._signer._key;

/**
 *
 * @param {User} user
 * @param messageBytes
 * @return {Buffer}
 */
exports.sign = (user, messageBytes) => user._signingIdentity.sign(messageBytes, undefined);


exports.fromClient = (client) => {
	return client._userContext;
};

exports.adminName = 'Admin';
exports.adminPwd = 'passwd';
