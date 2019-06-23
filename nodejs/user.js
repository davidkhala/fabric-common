const fs = require('fs');
const clientUtil = require('./client');
const logger = require('./logger').new('userUtil');
const ECDSA_KEY = require('fabric-common/lib/impl/ecdsa/key');
exports.formatUsername = (username, domain) => `${username}@${domain}`;
const User = require('fabric-common/lib/User');

const Identity = require('fabric-common/lib/Identity');
const SigningIdentity = require('fabric-common/lib/SigningIdentity');
const Signer = require('fabric-common/lib/Signer');
/**
 * Set the enrollment object for this User instance
 * @param {module:api.Key} privateKey the private key object
 * @param {string} certificate the PEM-encoded string of certificate
 * @param {string} mspId The Member Service Provider id for the local signing identity
 */
const setEnrollment = (user, privateKey, certificate, mspId) => {
	user._mspId = mspId;

	if (!user._cryptoSuite) {
		user._cryptoSuite = clientUtil.new();
	}


	const pubKey = user._cryptoSuite.createKeyFromRaw(certificate);

	user._identity = new Identity(certificate, pubKey, mspId, user._cryptoSuite);
	user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, user._cryptoSuite, new Signer(user._cryptoSuite, privateKey));
};

const build = (name, {key, certificate}, mspId, cryptoSuite = clientUtil.newCryptoSuite(), {roles, affiliation} = {}) => {

	const user = new User({name, roles, affiliation});
	let privateKey;
	if (key instanceof ECDSA_KEY) {
		privateKey = key;
	} else {
		// FIXME: importKey.then is not function in some case;
		privateKey = cryptoSuite.createKeyFromRaw(key);
	}
	user.setCryptoSuite(cryptoSuite);
	setEnrollment(user, privateKey, certificate, mspId);
	return user;
};
exports.build = build;

/**
 *
 * @param cryptoPath
 * @param nodeType
 * @param mspId
 * @param cryptoSuite
 * @returns {Promise<User>}
 */
exports.loadFromLocal = (cryptoPath, nodeType, mspId, cryptoSuite = clientUtil.newCryptoSuite()) => {
	const username = cryptoPath.userName;
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) {
		return;
	}
	const {keystore, signcerts} = exist;

	return build(username, {
		key: fs.readFileSync(keystore),
		certificate: fs.readFileSync(signcerts)
	}, mspId, cryptoSuite);
};

exports.getCertificate = (user) => user.getSigningIdentity()._certificate;
exports.getMSPID = (user) => user._mspId;
exports.getPrivateKey = (user) => user.getSigningIdentity()._signer._key;

const TransactionID = require('fabric-client/lib/TransactionID');
/**
 * Builds a new transactionID based on a user's certificate and a nonce value.
 * @param {User} user - An instance of {@link User} that provides an unique {Identity} base for this transaction id.
 * @param {boolean} [isAdmin] - Indicates whether this instance will be used for administrative transactions.
 */
exports.newTransactionID = (user, isAdmin) => new TransactionID(user.getSigningIdentity(), isAdmin);


exports.adminName = 'Admin';
exports.adminPwd = 'passwd';
