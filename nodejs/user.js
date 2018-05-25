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
exports.loadFromLocal = async (cryptoPath, nodeType, {mspId}, cryptoSuite) => {


	const username = cryptoPath.userName;
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) return;
	const {keystore, signcerts} = exist;

	// NOTE:(jsdoc) This allows applications to use pre-existing crypto materials (private keys and certificates) to construct user objects with signing capabilities
	// NOTE In client.createUser option, two types of cryptoContent is supported:
	// 1. cryptoContent: {		privateKey: keyFilePath,signedCert: certFilePath}
	// 2. cryptoContent: {		privateKeyPEM: keyFileContent,signedCertPEM: certFileContent}

	const user = await exports.build(username, {key: fs.readFileSync(keystore), certificate: fs.readFileSync(signcerts)}, mspId, cryptoSuite);

	return user;
};
exports.build = async (username, {key, certificate}, MSPID, cryptoSuite) => {
	const user = new User(username);
	user.setCryptoSuite(cryptoSuite);
	//FIXME: importKey.then is not function in some case;
	await user.setEnrollment(key, certificate, MSPID);
	return user;
};
exports.getCertificate = (user) => {
	return user.getSigningIdentity()._certificate;
};