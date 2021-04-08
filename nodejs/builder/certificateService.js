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
		const X509 = require('@ampretia/x509');
		const {normalizeX509} = require('khala-fabric-formatter/path');
		const cert = X509.parseCert(normalizeX509(pem));


		if (!cert.extensions || !cert.extensions.authorityKeyIdentifier) {
			const error = Error('Parsed certificate does not contain Authority Key Identifier');
			error.certificate = cert;
			throw error;
		}

		// convert the raw AKI string in the form of 'keyid:HX:HX....' (HX represents a hex-encoded byte) to a hex string
		const akiString = cert.extensions.authorityKeyIdentifier;
		const arr = akiString.split(':');
		if (arr[0] !== 'keyid') {
			throw Error(`Found an Authority Key Identifier we do not understand: first segment is not "keyid" but: ${akiString}`);
		}

		arr.shift(); // remove the 'keyid'
		const aki = arr.join('');
		const serial = cert.serial;

		return {aki, serial};
	}
}

module.exports = CertificateServiceBuilder;
