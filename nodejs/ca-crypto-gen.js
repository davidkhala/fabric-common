const caUtil = require('./ca');
const {toString: caStringify} = require('khala-fabric-formatter/ca');
const userUtil = require('./user');
const logger = require('khala-logger/log4js').consoleLogger('ca-crypto-gen');
const AffiliationServiceBuilder = require('khala-fabric-admin/affiliationService');
const {sleep} = require('khala-light-util');
const {getCertificate} = require('khala-fabric-formatter/signingIdentity');
/**
 *
 * @param {FabricCAServices} caService
 * @param {CryptoPath} adminCryptoPath should use host root path
 * @param {string} nodeType
 * @param {string} mspId
 * @param {boolean} TLS
 */
exports.initAdmin = async (caService, adminCryptoPath, nodeType, mspId, TLS) => {
	const enrollmentID = adminCryptoPath.userName;
	const enrollmentSecret = adminCryptoPath.password;


	const type = `${nodeType}User`;

	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	adminCryptoPath.toMSP(result, type);
	adminCryptoPath.toOrgAdmin(result, nodeType);
	adminCryptoPath.toAdminCerts(result, type);// required for 'peer channel signconfigtx'
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		adminCryptoPath.toTLS(tlsResult, type);
		adminCryptoPath.toOrgTLS(tlsResult, nodeType);
	}
};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} adminCryptoPath should be host path
 * @param {NodeType} nodeType
 * @param {string} mspId
 * @param {boolean} TLS
 * @param {string} [affiliationRoot]
 */
exports.init = async (caService, adminCryptoPath, nodeType, mspId, TLS, {affiliationRoot} = {}) => {
	logger.debug('init', {mspId, nodeType}, adminCryptoPath);
	const {[`${nodeType}OrgName`]: domain} = adminCryptoPath;
	if (!affiliationRoot) {
		affiliationRoot = domain;
	}

	let adminUser = userUtil.loadFromLocal(adminCryptoPath, nodeType, mspId, false);

	if (!adminUser) {
		const initAdminRetry = async () => {
			try {
				await exports.initAdmin(caService, adminCryptoPath, nodeType, mspId, TLS);
			} catch (e) {
				if (e.toString().includes('Calling enrollment endpoint failed with error')) {
					const ms = 1000;
					logger.warn(`ca ${caStringify(caService)} might not be ready, sleep and retry`);
					await sleep(ms);
					return initAdminRetry();
				}
				throw e;
			}
		};

		await initAdminRetry();
		adminUser = userUtil.loadFromLocal(adminCryptoPath, nodeType, mspId, true);
	} else {
		logger.info(`${adminCryptoPath.userName} of mspId[${mspId}] exists in local file system`);
	}

	const affiliationService = new AffiliationServiceBuilder(caService);

	const force = true;// true to create recursively
	await affiliationService.createIfNotExist({name: `${affiliationRoot}.client`, force}, adminUser);
	await affiliationService.createIfNotExist({name: `${affiliationRoot}.user`, force}, adminUser);
	await affiliationService.createIfNotExist({name: `${affiliationRoot}.peer`, force}, adminUser);
	await affiliationService.createIfNotExist({name: `${affiliationRoot}.orderer`, force}, adminUser);

	return adminUser;

};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {User} admin
 * @param TLS
 * @param {string} [affiliationRoot]
 * @returns {Promise<*>}
 */
exports.genOrderer = async (caService, cryptoPath, admin, {TLS, affiliationRoot} = {}) => {

	const type = 'orderer';
	const {ordererHostName, ordererOrgName: domain} = cryptoPath;
	if (!affiliationRoot) {
		affiliationRoot = domain;
	}
	const ordererMSPRoot = cryptoPath.MSP(type);

	const exist = cryptoPath.cryptoExistLocal(type);
	if (exist) {
		logger.info(`crypto exist in ${ordererMSPRoot}`);
		return;
	}

	const enrollmentID = ordererHostName;
	let enrollmentSecret = cryptoPath.password;
	const certificate = getCertificate(admin.getSigningIdentity());
	cryptoPath.toAdminCerts({certificate}, type);
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, admin, {
		enrollmentID,
		enrollmentSecret,
		role: 'orderer',
		affiliation: `${affiliationRoot}.orderer`
	});
	enrollmentSecret = newSecret;

	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	cryptoPath.toMSP(result, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		cryptoPath.toTLS(tlsResult, type);
		// assume cryptoPath.toOrgTLS is done in `initAdmin`
	}
	return admin;

};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {User} admin
 * @param TLS
 * @param {string} [affiliationRoot]
 * @returns {*}
 */
exports.genPeer = async (caService, cryptoPath, admin, {TLS, affiliationRoot} = {}) => {
	const type = 'peer';

	const {peerHostName, peerOrgName: domain} = cryptoPath;
	if (!affiliationRoot) {
		affiliationRoot = domain;
	}
	const peerMSPRoot = cryptoPath.MSP(type);

	const exist = cryptoPath.cryptoExistLocal(type);
	if (exist) {
		logger.info(`crypto exist in ${peerMSPRoot}`);
		return;
	}

	const enrollmentID = peerHostName;
	let enrollmentSecret = cryptoPath.password;
	const certificate = getCertificate(admin.getSigningIdentity());
	cryptoPath.toAdminCerts({certificate}, type);
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, admin, {
		enrollmentID,
		enrollmentSecret,
		role: 'peer',
		affiliation: `${affiliationRoot}.peer`
	});
	enrollmentSecret = newSecret;
	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	cryptoPath.toMSP(result, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		cryptoPath.toTLS(tlsResult, type);
		// assume cryptoPath.toOrgTLS is done in `initAdmin`
	}
};
/**
 * for non-admin user only
 * @param caService
 * @param {CryptoPath} cryptoPath
 * @param nodeType
 * @param admin
 * @param TLS
 * @param affiliationRoot
 * @returns {Promise<User>}
 */
exports.genUser = async (caService, cryptoPath, nodeType, admin, {TLS, affiliationRoot} = {}) => {

	const type = `${nodeType}User`;
	if (!affiliationRoot) {
		affiliationRoot = cryptoPath[`${nodeType}OrgName`];
	}

	const mspId = admin.getSigningIdentity()._mspId;
	let user = userUtil.loadFromLocal(cryptoPath, nodeType, mspId);
	if (user) {
		logger.info('user exist', {name: user.getName()});
		return user;
	}

	const enrollmentID = cryptoPath[`${nodeType}UserHostName`];
	let enrollmentSecret = cryptoPath.password;
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, admin, {
		enrollmentID,
		enrollmentSecret,
		role: 'user',
		affiliation: `${affiliationRoot}.user`
	});
	enrollmentSecret = newSecret;
	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	cryptoPath.toMSP(result, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		cryptoPath.toTLS(tlsResult, type);
	}
	user = userUtil.loadFromLocal(cryptoPath, nodeType, mspId, undefined);
	return user;
};
exports.genClientKeyPair = async (caService, {enrollmentID, enrollmentSecret}, admin, affiliationRoot) => {
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, admin, {
		enrollmentID,
		enrollmentSecret,
		role: 'client',
		affiliation: `${affiliationRoot}.client`
	});
	if (!enrollmentSecret) {
		enrollmentSecret = newSecret;
	}
	const {key, certificate, rootCertificate} = await caService.enroll({
		enrollmentID,
		enrollmentSecret,
		profile: 'tls'
	});
	return {key, certificate, rootCertificate};
};

