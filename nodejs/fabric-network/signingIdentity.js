/**
 * @extends X509Identity
 */
class SigningIdentity {
	constructor(signingIdentity) {
		this.type = 'X.509';
		this.mspId = signingIdentity._mspId;
		this.credentials = {
			certificate: signingIdentity._certificate.toString().trim(),
			privateKey: signingIdentity._signer._key.toBytes().trim(),
		};
	}

}

module.exports = SigningIdentity;