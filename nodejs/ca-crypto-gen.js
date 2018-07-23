const caUtil = require('./ca');
const userUtil = require('./user');
const logger = require('./logger').new('ca-crypto-gen');
const affiliationUtil = require('./affiliationService');
const commonHelper = require('./helper');
/**
 *
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath should be host path
 * @param {string} nodeType
 * @param {string} mspId
 * @param TLS
 * @returns {Promise<*>}
 */
exports.initAdmin = async (caService, cryptoPath, nodeType, mspId, TLS) => {
	const enrollmentID = cryptoPath.userName;
	const enrollmentSecret = cryptoPath.password;

	const {[`${nodeType}OrgName`]: domain} = cryptoPath;

	const type = `${nodeType}User`;
	const userFull = cryptoPath[`${nodeType}UserHostName`];
	const user = await userUtil.loadFromLocal(cryptoPath, nodeType, mspId, undefined);
	if (user) {
		logger.info(`${domain} admin found in local`);
		return user;
	}

	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	caUtil.toMSP(result, cryptoPath, type);
	caUtil.org.saveAdmin(result, cryptoPath, nodeType);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		caUtil.toTLS(tlsResult, cryptoPath, type);
		caUtil.org.saveTLS(tlsResult, cryptoPath, nodeType);
	}

	return await userUtil.build(userFull, result, mspId);
};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} adminCryptoPath should be host path
 * @param {string} nodeType
 * @param {string} mspId
 * @param TLS
 * @param {string} affiliationRoot
 * @returns {Promise<*>}
 */
exports.init = async (caService, adminCryptoPath, nodeType, mspId, {TLS, affiliationRoot} = {}) => {
	logger.debug('init', {mspId, nodeType}, adminCryptoPath);
	const {[`${nodeType}OrgName`]: domain} = adminCryptoPath;
	if (!affiliationRoot) affiliationRoot = domain;
	const force = true;//true to create recursively

	const initAdminRetry = async () => {
		try {
			return await exports.initAdmin(caService, adminCryptoPath, nodeType, mspId, TLS);
		} catch (e) {
			if (e.toString().includes('Calling enrollment endpoint failed with error')) {
				const ms = 1000;
				logger.warn(`ca ${caUtil.toString(caService)} might not be ready, sleep and retry`);
				await commonHelper.sleep(ms);
				return initAdminRetry();
			}
			throw e;
		}
	};

	const adminUser = await initAdminRetry();
	const affiliationService = affiliationUtil.new(caService);
	const promises = [
		affiliationUtil.createIfNotExist(affiliationService, {name: `${affiliationRoot}.user`, force}, adminUser),
		affiliationUtil.createIfNotExist(affiliationService, {name: `${affiliationRoot}.peer`, force}, adminUser),
		affiliationUtil.createIfNotExist(affiliationService, {name: `${affiliationRoot}.orderer`, force}, adminUser)
	];
	await Promise.all(promises);
	return adminUser;

};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {User} admin
 * @param TLS
 * @param {string} affiliationRoot
 * @returns {Promise<*>}
 */
exports.genOrderer = async (caService, cryptoPath, admin, {TLS, affiliationRoot} = {}) => {

	const type = 'orderer';
	const {ordererHostName, ordererOrgName: domain} = cryptoPath;
	if (!affiliationRoot) affiliationRoot = domain;
	const ordererMSPRoot = cryptoPath.MSP(type);

	const exist = cryptoPath.cryptoExistLocal(type);
	if (exist) {
		logger.info(`crypto exist in ${ordererMSPRoot}`);
		return;
	}

	const enrollmentID = ordererHostName;
	let enrollmentSecret = cryptoPath.password;
	const certificate = userUtil.getCertificate(admin);
	caUtil.toAdminCerts({certificate}, cryptoPath, type);
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, {
		enrollmentID,
		enrollmentSecret,
		role: 'orderer',
		affiliation: `${affiliationRoot}.orderer`
	}, admin);
	enrollmentSecret = newSecret;

	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	caUtil.toMSP(result, cryptoPath, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		caUtil.toTLS(tlsResult, cryptoPath, type);
		caUtil.org.saveTLS(tlsResult, cryptoPath, type);
	}
	return admin;

};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {string} affiliationRoot
 * @param {User} admin
 * @returns {*}
 */
exports.genPeer = async (caService, cryptoPath, admin, {TLS, affiliationRoot} = {}) => {
	const type = 'peer';

	const {peerHostName, peerOrgName: domain} = cryptoPath;
	if (!affiliationRoot) affiliationRoot = domain;
	const peerMSPRoot = cryptoPath.MSP(type);

	const exist = cryptoPath.cryptoExistLocal(type);
	if (exist) {
		logger.info(`crypto exist in ${peerMSPRoot}`);
		return;
	}

	const enrollmentID = peerHostName;
	let enrollmentSecret = cryptoPath.password;
	const certificate = userUtil.getCertificate(admin);
	caUtil.toAdminCerts({certificate}, cryptoPath, type);
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, {
		enrollmentID,
		enrollmentSecret,
		role: 'peer',
		affiliation: `${affiliationRoot}.peer`
	}, admin);
	enrollmentSecret = newSecret;
	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	caUtil.toMSP(result, cryptoPath, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		caUtil.toTLS(tlsResult, cryptoPath, type);
		caUtil.org.saveTLS(tlsResult, cryptoPath, type);
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
	if (!affiliationRoot) affiliationRoot = cryptoPath[`${nodeType}OrgName`];

	const mspId = userUtil.getMSPID(admin);
	let user = await userUtil.loadFromLocal(cryptoPath, nodeType, mspId, undefined);
	if (user) {
		logger.info('user exist', {name: user.getName()});
		return user;
	}

	const enrollmentID = cryptoPath[`${nodeType}UserHostName`];
	let enrollmentSecret = cryptoPath.password;
	// const certificate = userUtil.getCertificate(admin);
	// caUtil.peer.toAdminCerts({certificate}, cryptoPath, type);
	const {enrollmentSecret: newSecret} = await caUtil.register(caService, {
		enrollmentID,
		enrollmentSecret,
		role: 'user',
		affiliation: `${affiliationRoot}.user`
	}, admin);
	enrollmentSecret = newSecret;
	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	caUtil.toMSP(result, cryptoPath, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		caUtil.toTLS(tlsResult, cryptoPath, type);
	}
	user = await userUtil.loadFromLocal(cryptoPath, nodeType, mspId, undefined);
	return user;

};

