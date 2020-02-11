const ECDSA_KEY = require('fabric-client/lib/impl/ecdsa/key');
const User = require('fabric-client/lib/User');
const {SigningIdentity, Signer} = require('fabric-client/lib/msp/identity.js');
const {emptySuite} = require('./cryptoSuite');

class UserBuilder {

	constructor(name, {roles, affiliation} = {}) {
		/**
		 * @type {User}
		 */
		this.user = new User({name, roles, affiliation});
		this.user._cryptoSuite = emptySuite();
	}

	build({key, certificate, mspId}) {
		const {_cryptoSuite} = this.user;
		const privateKey = (key instanceof ECDSA_KEY) ? key : _cryptoSuite.importKey(key, {ephemeral: true}); // FIXME: importKey.then is not function in some case;


		const pubKey = _cryptoSuite.importKey(certificate, {ephemeral: true}); // FIXME: importKey.then is not function in some case;

		this.user._signingIdentity = new SigningIdentity(certificate, pubKey, mspId, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
		this.privateKey = privateKey;
		this.publicKey = pubKey;
		return this.user;
	}
}

module.exports = UserBuilder;