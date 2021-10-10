const caUtil = require('./ca');
const {toString: caStringify} = require('khala-fabric-formatter/ca');
const userUtil = require('./user');
const AffiliationServiceBuilder = require('./affiliationService');
const {sleep} = require('khala-light-util');

const {getCertificate} = require('khala-fabric-formatter/signingIdentity');

class CaCryptoGen {
	/**
	 *
	 * @param {FabricCAService} caService
	 * @param [cryptoPath] a root path
	 * @param {boolean} [TLS]
	 * @param logger
	 */
	constructor(caService, cryptoPath, TLS, logger = require('khala-logger/log4js').consoleLogger('ca-crypto-gen')) {
		Object.assign(this, {caService, cryptoPath, logger, TLS});
	}

	/**
	 *
	 * @param {NodeType} nodeType
	 */
	async initAdmin(nodeType) {
		const {caService, cryptoPath, logger} = this;
		const {userName: enrollmentID, password: enrollmentSecret} = cryptoPath;

		const type = `${nodeType}User`;

		let result;

		try {
			result = await caService.enroll({enrollmentID, enrollmentSecret});
		} catch (e) {
			if (e.toString().includes('Calling enrollment endpoint failed with error')) {
				const ms = 1000;
				logger.warn(`ca ${caStringify(caService)} might not be ready, sleep and retry`);
				await sleep(ms);
				return this.initAdmin(nodeType);
			}
			throw e;
		}

		cryptoPath.toMSP(result, type);
		cryptoPath.toOrgAdmin(result, nodeType);
		cryptoPath.toAdminCerts(result, type);// required for 'peer channel signconfigtx'
	}

	/**
	 * @param {NodeType} nodeType
	 * @param {string} mspid
	 * @param {string} [affiliationRoot]
	 */
	async init(nodeType, mspid, {affiliationRoot} = {}) {

		const {caService, cryptoPath, logger} = this;
		const {[`${nodeType}OrgName`]: domain} = cryptoPath;
		if (!affiliationRoot) {
			affiliationRoot = domain;
		}

		logger.debug(`start init on ${mspid}`);
		await this.initAdmin(nodeType);

		const adminUser = userUtil.loadFromLocal(cryptoPath, nodeType, mspid, true);


		const affiliationService = new AffiliationServiceBuilder(caService, adminUser);

		const force = true;// true to create recursively
		await affiliationService.createIfNotExist(`${affiliationRoot}.client`, force);
		await affiliationService.createIfNotExist(`${affiliationRoot}.user`, force);
		await affiliationService.createIfNotExist(`${affiliationRoot}.${nodeType}`, force);
		return adminUser;

	}


	async genOrg(admin, type) {
		const {caService, cryptoPath} = this;


		const orgName = cryptoPath[`${type}OrgName`];
		const enrollmentID = orgName;

		const enrollmentSecret = 'passwd';
		await caUtil.register(caService, admin, {
			enrollmentID,
			enrollmentSecret,
			affiliation: orgName
		});
		const dns = [`*.${orgName}`];
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'}, {dns});
		cryptoPath.toOrgTLS(tlsResult, type);
	}


	/**
	 * @param {User} admin
	 * @param {string} [affiliationRoot]
	 */
	async genOrderer(admin, {affiliationRoot} = {}) {
		const {caService, cryptoPath, logger} = this;
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
		const certificate = getCertificate(admin._signingIdentity);
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
		// etcdraft always need TLS material


		const dns = [ordererHostName, 'localhost'];
		const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'}, {dns});
		cryptoPath.toTLS(tlsResult, type);


		return admin;

	}

	/**
	 * @param {User} admin
	 * @returns {*}
	 */
	async genPeer(admin) {
		const type = 'peer';
		const {caService, cryptoPath, logger, TLS} = this;
		const {peerHostName, peerOrgName: domain} = cryptoPath;

		const affiliationRoot = domain;

		const peerMSPRoot = cryptoPath.MSP(type);

		const exist = cryptoPath.cryptoExistLocal(type);
		if (exist) {
			logger.info(`crypto exist in ${peerMSPRoot}`);
			return;
		}

		const enrollmentID = peerHostName;
		let enrollmentSecret = cryptoPath.password;
		const certificate = getCertificate(admin._signingIdentity);
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
			const dns = [peerHostName, 'localhost'];
			const tlsResult = await caService.enroll({enrollmentID, enrollmentSecret, profile: 'tls'}, {dns});
			cryptoPath.toTLS(tlsResult, type);
		}
	}

	/**
	 * for non-admin user only
	 * @param nodeType
	 * @param admin
	 * @returns {Promise<User>}
	 */
	async genUser(nodeType, admin) {
		const {caService, cryptoPath, logger, TLS} = this;
		const type = `${nodeType}User`;

		const affiliationRoot = cryptoPath[`${nodeType}OrgName`];


		const mspid = admin.mspId;
		let user = userUtil.loadFromLocal(cryptoPath, nodeType, mspid);
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

		user = userUtil.loadFromLocal(cryptoPath, nodeType, mspid, undefined);
		return user;
	}

	async genClientKeyPair({enrollmentID, enrollmentSecret}, admin, affiliationRoot) {
		const {caService} = this;
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
	}
}


module.exports = CaCryptoGen;