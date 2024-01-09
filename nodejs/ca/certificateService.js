import CertificateService from 'fabric-ca-client/lib/CertificateService.js';
import FabricCAClient from 'fabric-ca-client/lib/FabricCAClient.js';
import {ECDSAConfig, ECDSAKeyPair} from '@davidkhala/crypto/ECDSA.js';
import {Extension} from '@davidkhala/crypto/extension.js';
import {asn1} from 'jsrsasign';

export default class CertificateServiceWrapper {
	/**
	 *
	 * @param {FabricCAService} caService
	 * @param {User} [adminUser] not required for enroll
	 * @param logger
	 */
	constructor(caService, adminUser, logger = console) {
		this.certificateService = new CertificateService(caService._fabricCAClient);
		this.registrar = adminUser;
		this.logger = logger;
	}

	/**
	 * @returns {FabricCAClient}
	 */
	get caClient() {
		return this.certificateService.client;
	}

	// TODO rewrite use axios promise
	async getAll() {

		const {result} = await this.certificateService.getCertificates(undefined, this.registrar);
		const {certs, caname} = result;
		return certs;
	}

	/**
	 * @typedef {Object} AttributeRequest
	 * @property {string} name - The name of the attribute to include in the certificate
	 * @property {boolean} optional - throw an error if the identity does not have the attribute
	 */

	/**
	 * @typedef {Object} EnrollmentRequest
	 * @property {string} enrollmentID - The registered ID to use for enrollment
	 * @property {string} enrollmentSecret - The secret associated with the enrollment ID
	 * @property {string} [profile] - The profile name.  Specify the 'tls' profile for a TLS certificate;
	 *                   otherwise, an enrollment certificate is issued.
	 * @property {string} [csr] - Optional. PEM-encoded PKCS#10 Certificate Signing Request.
	 * @property {AttributeRequest[]} [attr_reqs]
	 */

	/**
	 * Enroll the member and return an opaque member object.
	 *
	 * @param {EnrollmentRequest} req If the request contains the field "csr", this csr will be used for
	 *     getting the certificate from Fabric-CA. Otherwise , a new private key will be generated and be used to
	 *     generate a csr later.
	 * @param {number} [keySize] required if no csr
	 * @param [subject]
	 * @param [dns]
	 */
	async enroll(req, {keySize = 256, subject, dns = []} = {}) {
		const {enrollmentID, enrollmentSecret, profile, attr_reqs} = req;

		if (!subject) {
			subject = `CN=${enrollmentID}`;
		}
		let {csr} = req;

		const result = {};
		if (!csr) {
			const config = new ECDSAConfig(keySize);
			const keyPair = config.generateEphemeralKey();
			const key = new ECDSAKeyPair(keyPair, {keySize});
			Object.assign(result, {keyPair, key: keyPair.prvKeyObj});
			const extension = Extension.asSAN(dns);
			csr = key.generateCSR({str: asn1.x509.X500Name.ldapToOneline(subject)}, [extension]);
		}

		const enrollResponse = await this.caClient.enroll(enrollmentID, enrollmentSecret, csr, profile, attr_reqs);

		Object.assign(result, {
			certificate: enrollResponse.enrollmentCert,
			rootCertificate: enrollResponse.caCertChain
		});
		return result;
	}

}