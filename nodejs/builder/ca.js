const FabricCAServices = require('fabric-ca-client/lib/FabricCAServices');

const {emptySuite} = require('./cryptoSuite');

class CAService {
	/**
	 *
	 * @param {CryptoSuite} cryptoSuite
	 */
	constructor(cryptoSuite) {
		this.cryptoSuite = cryptoSuite;
	}

	/**
	 *
	 * @param {string} caUrl
	 * @param {CertificatePem[]} trustedRoots tlsca for connection
	 * @returns {FabricCAServices}
	 */
	build(caUrl, trustedRoots = []) {
		let cryptoSuite = this.cryptoSuite;
		if (!cryptoSuite) {
			cryptoSuite = emptySuite();
		}
		const tlsOptions = {
			trustedRoots,
			verify: trustedRoots.length > 0
		};
		return new FabricCAServices(caUrl, tlsOptions, '', cryptoSuite);
	}
}

module.exports = CAService;