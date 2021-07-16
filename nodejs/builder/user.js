const User = require('fabric-client/lib/User');
const {SigningIdentity, Signer} = require('fabric-client/lib/msp/identity.js');
const {emptySuite} = require('./cryptoSuite');
const TransactionID = require('fabric-client/lib/TransactionID');
const {getCertificate, getMSPID, getPrivateKey, getPublicKey, sign} = require('khala-fabric-formatter/signingIdentity.js');
const {sha2_256} = require('./helper');

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
	 * @return {Client.User}
	 */
	build({key, certificate, mspId}) {
		const {_cryptoSuite} = this.user;
		const privateKey = (key.constructor.name === 'ECDSA_KEY') ? key : _cryptoSuite.importKey(key, {ephemeral: true});

		const pubKey = _cryptoSuite.importKey(certificate, {ephemeral: true});

		this.user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
		return this.user;
	}

	/**
	 * Builds a new transactionID based on a user's certificate and a nonce value.
	 * @param {User} user
	 * @param {Buffer} [nonce] use external nonce if specified, instead of randomly creating one
	 * @param {boolean} [isAdmin] - Indicates whether this instance will be used for administrative transactions.
	 */
	static newTransactionID(user, nonce, isAdmin) {
		const txid = new TransactionID(user._signingIdentity, isAdmin);
		if (nonce) {
			txid._nonce = nonce;
			const creator_bytes = user._signingIdentity.serialize();// same as signatureHeader.Creator
			const trans_bytes = Buffer.concat([nonce, creator_bytes]);
			txid._transaction_id = sha2_256(trans_bytes);
		}
		return txid;
	}


	getPublicKey() {
		return getPublicKey(this.user._signingIdentity);
	}

	getCertificate() {
		return getCertificate(this.user._signingIdentity);
	}

	getMSPID() {
		return getMSPID(this.user._signingIdentity);
	}

	getPrivateKey() {
		return getPrivateKey(this.user._signingIdentity);
	}

	sign(messageBytes) {
		return sign(this.user._signingIdentity, messageBytes);
	}

}

module.exports = UserBuilder;