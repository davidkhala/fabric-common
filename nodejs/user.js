const fs = require('fs');
const clientUtil = require('./client');
const logger = require('./logger').new('userUtil');
const ECDSA_KEY = require('fabric-client/lib/impl/ecdsa/key');
exports.formatUsername = (username, domain) => `${username}@${domain}`;
const User = require('fabric-client/lib/User');
/**
 *
 * @param cryptoPath
 * @param nodeType
 * @param mspId
 * @param cryptoSuite
 * @returns {Promise|*|Promise<User>}
 */
exports.loadFromLocal = async (cryptoPath, nodeType, mspId, cryptoSuite = clientUtil.newCryptoSuite()) => {
	const username = cryptoPath.userName;
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) return;
	const {keystore, signcerts} = exist;

	const user = await exports.build(username, {key: fs.readFileSync(keystore), certificate: fs.readFileSync(signcerts)}, mspId, cryptoSuite);

	return user;
};
exports.build = async (username, {key, certificate}, MSPID, cryptoSuite = clientUtil.newCryptoSuite()) => {
	const user = new User(username);
	let privateKey;
	if (key instanceof ECDSA_KEY) {
		privateKey = key;
	} else {
		//FIXME: importKey.then is not function in some case;
		privateKey = await cryptoSuite.importKey(key, {ephemeral: true});
	}
	user.setCryptoSuite(cryptoSuite);
	await user.setEnrollment(privateKey, certificate, MSPID);
	return user;
};
exports.getCertificate = (user) => user.getSigningIdentity()._certificate;
exports.getMSPID = (user) => user._mspId;
exports.adminName = 'Admin';
exports.adminPwd = 'passwd';