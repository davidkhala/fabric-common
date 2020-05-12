/**
 *
 * @param {SigningIdentity} signingIdentity
 * @return {module:api.Key} publicKey The public key represented by the certificate
 */
exports.getPublicKey = (signingIdentity) => signingIdentity._publicKey;


/**
 *
 * @param {SigningIdentity} signingIdentity
 * @return {ECDSA_KEY}
 */
exports.getPrivateKey = (signingIdentity) => signingIdentity._signer._key;

/**
 *
 * @param {SigningIdentity} signingIdentity
 * @return {CertificatePem}
 */
exports.getCertificate = (signingIdentity) => signingIdentity._certificate.toString().trim();

/**
 *
 * @param {SigningIdentity} signingIdentity
 * @return {MspId}
 */
exports.getMSPID = (signingIdentity) => signingIdentity._mspId;
