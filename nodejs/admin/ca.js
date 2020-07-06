const FabricCAServices = require('fabric-ca-client/lib/FabricCAServices');

const {emptySuite} = require('./cryptoSuite');

class CAService {
	/**
	 *
	 * @param {string} caUrl
	 * @param {CertificatePem[]} [trustedRoots] tls CA for connection
	 * @param {Client.CryptoSuite} [cryptoSuite]
	 */
	constructor(caUrl, trustedRoots = [], cryptoSuite) {
		if (!cryptoSuite) {
			cryptoSuite = emptySuite();
		}
		const tlsOptions = {
			trustedRoots,
			verify: trustedRoots.length > 0
		};
		this.caService = new FabricCAServices(caUrl, tlsOptions, '', cryptoSuite);
	}


	/**
	 * @return {FabricCAClient}
	 */
	getClient() {
		return this.caService._fabricCAClient;
	}

	// The Idemix credential issuance is a two step process.
	// First, send a request with an empty body to the /api/v1/idemix/credential API endpoint to get a nonce and CA’s Idemix public key.
	// Second, create a credential request using the nonce and CA’s Idemix public key and send another request with the credential request in the body to the /api/v1/idemix/credential API endpoint to get an Idemix credential,
	//      Credential Revocation Information (CRI), and attribute names and values. Currently, only three attributes are supported:
	// ( About credential request, there are java or golang based implementations:
	//      golang: https://github.com/hyperledger/fabric-ca/blob/fc84b4f088e4a253da012276a4d0b9e3518a3565/lib/client.go#L523
	//  )
	// OU - organization unit of the identity. The value of this attribute is set to identity’s affiliation. For example, if identity’s affiliation is dept1.unit1, then OU attribute is set to dept1.unit1
	// IsAdmin - if the identity is an admin or not. The value of this attribute is set to the value of isAdmin registration attribute.
	// EnrollmentID - enrollment ID of the identity
	/**
	 * TODO WIP
	 * @param {User} admin
	 */
	async idemixEnroll(admin) {
		const client = this.getClient();
		const {result, errors, messages, success} = await client.post('idemix/credential', {}, admin._signingIdentity);
		const {Nonce, CAInfo: {IssuerPublicKey, IssuerRevocationPublicKey}} = result;
		const nonce = Buffer.from(Nonce, 'base64');
		await client.post('idemix/credential',);
		return result;

	}
}

module.exports = CAService;
