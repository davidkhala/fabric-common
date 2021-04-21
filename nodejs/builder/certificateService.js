const assert = require('assert');

class CertificateServiceBuilder {
	constructor(caService, logger = console) {
		this.affiliationService = caService.newCertificateService();
		this.logger = logger;
	}

	async getAll(caAdmin, {includeRevoked, includeExpired} = {}) {
		const opt = {
			notrevoked: true,
			notexpired: true
		};
		if (includeRevoked) {
			delete opt.notrevoked;
		}
		if (includeExpired) {
			delete opt.notexpired;
		}

		const {result, errors, messages, success} = await this.affiliationService.getCertificates(opt, caAdmin);
		assert.ok(success);
		assert.ok(Array.isArray(messages));
		assert.ok(Array.isArray(errors));

		const {certs, caname} = result;
		return certs.map(({PEM}) => PEM);
	}

	/**
	 * @typedef {Object} RevokedCert
	 * @property {string} Serial
	 * @property {string} AKI
	 */

	/**
	 *
	 * @param {PEM} certificate
	 * @param {Client.User} caAdmin
	 * @param {string} [reason]
	 * @return {Promise<{revokedCert:RevokedCert, CRL:string}>}
	 */
	async revokeCertificate(certificate, caAdmin, reason) {
		const {aki, serial} = CertificateServiceBuilder.inspect(certificate);
		const {
			result,
			messages,
			errors,
			success
		} = await this.affiliationService.client.revoke(undefined, aki, serial, reason, caAdmin.getSigningIdentity());
		assert.ok(success);
		assert.ok(Array.isArray(messages));
		assert.ok(Array.isArray(errors));
		assert.strictEqual(result.RevokedCerts.length, 1);

		const revokedCert = result.RevokedCerts[0];
		assert.strictEqual(revokedCert.Serial, serial.toLowerCase());
		assert.strictEqual(revokedCert.AKI, aki.toLowerCase());
		return {revokedCert, CRL: result.CRL};
	}

	static inspect(pem) {
		const {X509} = require('jsrsasign');

		const x509 = new X509();
		x509.readCertPEM(pem);

		const aki = x509.getExtAuthorityKeyIdentifier().kid;

		const serial = x509.getSerialNumberHex();
		return {aki, serial};
	}
}

module.exports = CertificateServiceBuilder;
