const FabricCAServices = require('fabric-ca-client/lib/FabricCAServices');

const {emptySuite} = require('./cryptoSuite');

class CAService {
	/**
	 *
	 * @param {string} caUrl
	 * @param {CertificatePem[]} [trustedRoots] tls CA for connection
	 * @param {string} [caName]
	 * @param {Client.ICryptoSuite} [cryptoSuite]
	 */
	constructor(caUrl, trustedRoots = [], caName = '', cryptoSuite = emptySuite()) {
		const tlsOptions = {
			trustedRoots,
			verify: trustedRoots.length > 0
		};
		this.caService = new FabricCAServices(caUrl, tlsOptions, caName, cryptoSuite);

	}
}

module.exports = CAService;