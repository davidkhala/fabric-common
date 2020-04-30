const IdentityContext = require('fabric-common/lib/IdentityContext');// TODO TransactionID
const SigningIdentity = require('fabric-common/lib/SigningIdentity');
const Signer = require('fabric-common/lib/Signer');
const User = require('fabric-common/lib/User');
const {emptySuite} = require('./cryptoSuite');

class UserBuilder {

	/**
	 *
	 * @param {string} [name]
	 * @param {string[]} [roles]
	 * @param {string} [affiliation]
	 * @param {User} [user]
	 */
	constructor({name, roles, affiliation} = {}, user) {
		if (!user) {
			user = new User({name, roles, affiliation});
			user._cryptoSuite = emptySuite();
		}
		this.user = user;
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

		const pubKey = _cryptoSuite.createKeyFromRaw(certificate);

		this.user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
		return this.user;
	}

	/**
	 * Builds a new transactionID based on a user's certificate and a nonce value.
	 * @param {User} user
	 */
	static newTransactionID(user) {
		const identityContext = new IdentityContext(user, {});
		identityContext.calculateTransactionId();
		const {nonce, transactionId} = identityContext;
		return {nonce, transactionId};
	}

}

module.exports = UserBuilder;