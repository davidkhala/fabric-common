const IdentityContext = require('fabric-common/lib/IdentityContext');
const SigningIdentity = require('fabric-common/lib/SigningIdentity');
const Signer = require('fabric-common/lib/Signer');
const User = require('fabric-common/lib/User');
const {emptySuite} = require('./cryptoSuite');
const {calculateTransactionId} = require('khala-fabric-formatter/helper');

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
	 * @param {module:api.Key|string} key The private key object or the file path of pem format key
	 * @param {CertificatePem} certificate
	 * @param {MspId} mspId - This is required when Client#signChannelConfig
	 * @return {Client.User}
	 */
	build({key, certificate, mspId}) {
		const {_cryptoSuite} = this.user;
		const privateKey = (key.constructor.name === 'ECDSA_KEY') ? key : _cryptoSuite.createKeyFromRaw(key);

		const pubKey = _cryptoSuite.createKeyFromRaw(certificate);
		this.user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
		this.user.getIdentity = () => {
			return this.user._signingIdentity;
		};
		return this.user;
	}

	getSigningIdentity() {
		return this.user._signingIdentity;
	}

	getIdentityContext() {
		return UserBuilder.getIdentityContext(this.user);
	}

	/**
	 * @param {Client.User} user
	 */
	static getIdentityContext(user) {
		return new IdentityContext(user, null);
	}

	/**
	 * Builds a new transactionID based on a user's certificate and a nonce value.
	 * @param {Client.User} user
	 */
	static newTransactionID(user) {
		const identityContext = UserBuilder.getIdentityContext(user);
		identityContext.calculateTransactionId();
		const {nonce, transactionId} = identityContext;
		return {nonce, transactionId};
	}

	/**
	 * Create a new transaction ID value. The new transaction ID will be set both on this object and on the return
	 * value, which is a copy of this identity context. Calls to this function will not affect the transaction ID value
	 * on copies returned from previous calls.
	 * @param {IdentityContext}	identityContext
	 * @param {Buffer} nonce
	 */
	static calculateTransactionId(identityContext, nonce) {

		const {mspid, user} = identityContext;
		const id_bytes = Buffer.from(user.getIdentity()._certificate);
		return calculateTransactionId({creator: {mspid, id_bytes}, nonce});
	}

}

module.exports = UserBuilder;
