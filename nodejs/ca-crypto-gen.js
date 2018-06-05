const caUtil = require('./ca');
const userUtil = require('./user');
const logger = require('./logger').new('ca-crypto-gen');
const affiliationUtil = require('./affiliationService');
/**
 *
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {string} nodeType
 * @param {string} mspId
 * @returns {Promise<*>}
 */
exports.initAdmin = async (caService, cryptoPath, nodeType, mspId) => {
	const enrollmentID = userUtil.adminName;
	const enrollmentSecret = userUtil.adminPwd;

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

	return await userUtil.build(userFull, result, mspId);
};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {string} nodeType
 * @param {string} mspId
 * @param {string} affiliationRoot
 * @returns {Promise<*>}
 */
exports.init = async (caService, cryptoPath, nodeType, mspId, {affiliationRoot} = {}) => {
	logger.debug('init', {mspId, nodeType}, cryptoPath);
	const {[`${nodeType}OrgName`]: domain} = cryptoPath;
	if (!affiliationRoot) affiliationRoot = domain;
	const affiliationService = caService.newAffiliationService();
	const force = true;//true to create recursively


	const adminUser = await exports.initAdmin(caService, cryptoPath, nodeType, mspId);
	const promises = [
		affiliationUtil.creatIfNotExist(affiliationService, {name: `${affiliationRoot}.user`, force}, adminUser),
		affiliationUtil.creatIfNotExist(affiliationService, {name: `${affiliationRoot}.peer`, force}, adminUser),
		affiliationUtil.creatIfNotExist(affiliationService, {name: `${affiliationRoot}.orderer`, force}, adminUser)
	];
	await Promise.all(promises);
	return adminUser;

};
/**
 * @param {FabricCAServices} caService
 * @param {CryptoPath} cryptoPath
 * @param {User} admin
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
	const enrollmentSecret = cryptoPath.password;
	const certificate = userUtil.getCertificate(admin);
	caUtil.peer.toAdminCerts({certificate}, cryptoPath, type);
	await caUtil.register(caService, {
		enrollmentID,
		enrollmentSecret,
		role: 'orderer',
		affiliation: `${affiliationRoot}.orderer`
	}, admin);

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
 *
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
	const enrollmentSecret = cryptoPath.password;
	const certificate = userUtil.getCertificate(admin);
	caUtil.peer.toAdminCerts({certificate}, cryptoPath, type);
	await caUtil.register(caService, {
		enrollmentID,
		enrollmentSecret,
		role: 'peer',
		affiliation: `${affiliationRoot}.peer`
	}, admin);
	const result = await caService.enroll({enrollmentID, enrollmentSecret});
	caUtil.toMSP(result, cryptoPath, type);
	if (TLS) {
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'});
		caUtil.toTLS(tlsResult, cryptoPath, type);
		caUtil.org.saveTLS(tlsResult, cryptoPath, type);
	}
};

