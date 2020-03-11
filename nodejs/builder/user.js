const User = require('fabric-client/lib/User');
const {SigningIdentity, Signer} = require('fabric-client/lib/msp/identity.js');
const {emptySuite} = require('./cryptoSuite');
const TransactionID = require('fabric-client/lib/TransactionID');

class UserBuilder {

	/**
	 *
	 * @param name
	 * @param roles
	 * @param affiliation
	 * @param [user]
	 * @param logger
	 */
	constructor(name, {roles, affiliation} = {}, user, logger = console) {
		if (!user) {
			user = new User({name, roles, affiliation});
			user._cryptoSuite = emptySuite();
		}
		this.user = user;
		this.logger = logger;
	}

	/**
	 * We use ephemeral key manage fashion
	 *  - ensure no local wallet in server
	 *  - cryptoSuite.importKey return a non-promise object
	 * @param {module:api.Key} key the private key object
	 * @param {CertificatePem} certificate
	 * @param {MspId} mspId - This is required when Client#signChannelConfig
	 * @return {User}
	 */
	build({key, certificate, mspId}) {
		const {_cryptoSuite} = this.user;
		const privateKey = (key.constructor.name === 'ECDSA_KEY') ? key : _cryptoSuite.importKey(key, {ephemeral: true});

		const pubKey = _cryptoSuite.importKey(certificate, {ephemeral: true});

		this.user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
		this.privateKey = privateKey;
		this.publicKey = pubKey;
		return this.user;
	}

	getCertificate() {
		return this.user.getSigningIdentity()._certificate;
	}

	getMSPID() {
		return this.user._mspId;
	}

	getPrivateKey() {
		return this.user.getSigningIdentity()._signer._key;
	}


	/**
	 * Builds a new transactionID based on a user's certificate and a nonce value.
	 * @param {User} user
	 * @param {boolean} [isAdmin] - Indicates whether this instance will be used for administrative transactions.
	 */
	static newTransactionID(user, isAdmin) {
		return new TransactionID(user.getSigningIdentity(), isAdmin);
	}

	newTransactionID(isAdmin) {
		return UserBuilder.newTransactionID(this.user, isAdmin);
	}

}

module.exports = UserBuilder;