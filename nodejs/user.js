const fs = require('fs');
const clientUtil = require('./client');
const ECDSA_KEY = require('fabric-common/lib/impl/ecdsa/key');
exports.formatUsername = (username, domain) => `${username}@${domain}`;
const User = require('fabric-common/lib/User');

const Identity = require('fabric-common/lib/Identity');
const SigningIdentity = require('fabric-common/lib/SigningIdentity');
const Signer = require('fabric-common/lib/Signer');
/**
 * Set the enrollment object for this User instance
 * @param {User} user
 * @param {module:api.Key} privateKey the private key object
 * @param {string} certificate the PEM-encoded string of certificate
 * @param {MspId} mspId MSPID for the local signing identity. Note that this is required when Client#signChannelConfig
 */
const setEnrollment = (user, privateKey, certificate, mspId) => {

	if (!user._cryptoSuite) {
		user._cryptoSuite = clientUtil.new();
	}


	const pubKey = user._cryptoSuite.createKeyFromRaw(certificate);


	user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, user._cryptoSuite, new Signer(user._cryptoSuite, privateKey));
};

/**
 * @param name
 * @param key
 * @param certificate
 * @param mspId
 * @param cryptoSuite
 * @param roles
 * @param affiliation
 * @return {User}
 */
const build = (name, {key, certificate}, mspId, cryptoSuite = clientUtil.newCryptoSuite(), {roles, affiliation} = {}) => {
	/**
	 * @type {User}
	 */
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
 * @param {NodeType} nodeType
 * @param mspId
 * @param cryptoSuite
 * @returns {User}
 */
exports.loadFromLocal = (cryptoPath, nodeType, mspId, cryptoSuite = clientUtil.newCryptoSuite()) => {
	const username = cryptoPath.userName;
	const exist = cryptoPath.cryptoExistLocal(`${nodeType}User`);
	if (!exist) {
		return undefined;
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

/**
 *
 * @param {User} user
 * @param messageBytes
 * @return {Buffer}
 */
exports.sign = (user, messageBytes) => user._signingIdentity.sign(messageBytes, undefined);

const TransactionID = require('fabric-client/lib/TransactionID');
/**
 * Builds a new transactionID based on a user's certificate and a nonce value.
 * @param {User} user - An instance of {@link User} that provides an unique {Identity} base for this transaction id.
 * @param {boolean} [isAdmin] - Indicates whether this instance will be used for administrative transactions.
 */
exports.newTransactionID = (user, isAdmin) => new TransactionID(user.getSigningIdentity(), isAdmin);
exports.fromClient = (client) => {
	return client._userContext;
};

exports.adminName = 'Admin';
exports.adminPwd = 'passwd';
