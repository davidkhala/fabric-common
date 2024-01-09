/**
 * @typedef {Object} Identity
 * @property {string} id
 * @property {string} type
 * @property {Object[]} attrs
 * @property {string} affiliation
 * @property {number} max_enrollments
 */
import IdentityService from 'fabric-ca-client/lib/IdentityService.js';


function isNotExistError({errors}) {
	if (errors && Array.isArray(errors) && errors.length === 1) {
		const {code, message} = errors[0];
		if (code === 63 && message === 'Failed to get User: sql: no rows in result set') {
			return true;
		}
	}
}

export default class IdentityServiceWrapper {
	/**
	 *
	 * @param {FabricCAService} caService
	 * @param {User} adminUser
	 * @param logger
	 */
	constructor(caService, adminUser, logger = console) {
		this.identityService = new IdentityService(caService._fabricCAClient);
		this.registrar = adminUser;
		this.logger = logger;
	}

	/**
	 * create if not exist
	 * @param {string} enrollmentID
	 * @param {string} [enrollmentSecret]
	 * @param {string} affiliation
	 * @param {string} role
	 * @param {KeyValueAttribute[]} [attrs]
	 * @param [caname]
	 * @param [maxEnrollments]
	 * @return {Promise<string|undefined>} The enrollment secret if not exist. If not provided as parameter, a random secret is generated.
	 */
	async createIfNotExist({enrollmentID, enrollmentSecret, affiliation, role, attrs, caname, maxEnrollments}) {
		const existing = await this.getOne({enrollmentID});
		if (existing) {
			this.logger.warn(`warn: ${enrollmentID} exist`);
			this.logger.warn(existing);
			return;
		}
		if (!maxEnrollments) {
			maxEnrollments = -1;
		}
		const allowedType = Object.values(IdentityService.HFCAIdentityType);
		if (role && !allowedType.includes(role)) {
			throw Error(`invalid role:${role},should be one of ${allowedType}`);
		}
		/**
		 *
		 * @type {IdentityRequest}
		 */
		const req = {
			enrollmentID,
			enrollmentSecret,
			affiliation,
			type: role,
			maxEnrollments,
			attrs,
			caname,
		};

		return this.identityService.create(req, this.registrar);
	}

	/**
	 * support update password
	 * @param {Client.User} admin
	 * @param enrollmentID
	 * @param role
	 * @param affiliation
	 * @param maxEnrollments
	 * @param [attrs]
	 * @param enrollmentSecret
	 * @param [caname]
	 * @returns {Promise<*>} TODO return data type
	 */
	async update({enrollmentID, role, affiliation, maxEnrollments, attrs, enrollmentSecret, caname}) {
		const allowedType = Object.values(IdentityService.HFCAIdentityType);
		if (!allowedType.includes(role)) {
			throw Error(`invalid role:${role},should be one of ${allowedType}`);
		}
		const req = {
			type: role,
			affiliation, maxEnrollments,
			attrs,
			enrollmentSecret,
			caname,
		};
		return await this.identityService.update(enrollmentID, req, this.registrar);
	}

	/**
	 * no password in return
	 * @returns {Promise<Identity[]>}
	 */
	async getAll() {
		const {result} = await this.identityService.getAll(this.registrar);
		const {identities} = result;
		return identities;
	}

	async getOne({enrollmentID}) {
		try {
			const {result} = await this.identityService.getOne(enrollmentID, this.registrar);
			return result;
		} catch (e) {
			if (isNotExistError(e)) {
				return;
			}
			throw e;
		}
	}

	/**
	 *
	 * @param enrollmentID
	 * @returns {Promise<Identity|undefined>}
	 */
	async delete({enrollmentID}) {
		try {
			const {result} = await this.identityService.delete(enrollmentID, this.registrar, true);
			return result;
		} catch (e) {
			if (isNotExistError(e)) {
				return;
			}
			throw e;
		}

	}
}
