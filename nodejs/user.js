const fsExtra = require('fs-extra');
const fs = require('fs');
const path = require('path');
const pathUtil = require('./path');
const clientUtil = require('./client');
const logger = require('./logger').new('userUtil');
exports.formatUsername = (username, domain) => `${username}@${domain}`;
const User = require('fabric-client/lib/User');
/**
 *
 * @param userMSPRoot
 * @param cryptoPath
 * @param nodeType
 * @param cryptoSuite
 * @returns {Promise|*|Promise<User>}
 */
exports.loadFromLocal = async (cryptoPath, nodeType, {mspId}, cryptoSuite=clientUtil.newCryptoSuite()) => {


	const username = cryptoPath.userName;
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) return;
	const {keystore, signcerts} = exist;

	const user = await exports.build(username, {key:fs.readFileSync(keystore), certificate: fs.readFileSync(signcerts)}, mspId, cryptoSuite);

	return user;
};
exports.build = async (username, {key, certificate}, MSPID, cryptoSuite) => {
	const user = new User(username);
	//FIXME: importKey.then is not function in some case;
	const privateKey = await cryptoSuite.importKey(key, {ephemeral: true});
	user.setCryptoSuite(cryptoSuite);
	await user.setEnrollment(privateKey, certificate, MSPID);
	return user;
};
exports.getCertificate = (user) => {
	return user.getSigningIdentity()._certificate;
};