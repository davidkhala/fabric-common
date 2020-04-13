const FabricCAServices = require('fabric-ca-client/lib/FabricCAServices');

const {emptySuite} = require('./cryptoSuite');

class CAService {
	/**
	 *
	 * @param {string} caUrl
	 * @param {CertificatePem[]} [trustedRoots] tls CA for connection
	 * @param {Client.ICryptoSuite} [cryptoSuite]
	 */
	constructor(caUrl, trustedRoots = [], cryptoSuite = emptySuite()) {
		const tlsOptions = {
			trustedRoots,
			verify: trustedRoots.length > 0
		};
		this.caService = new FabricCAServices(caUrl, tlsOptions, '', cryptoSuite);

	}
}

module.exports = CAService;