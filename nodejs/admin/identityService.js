/**
 * @typedef {Object} Identity
 * @property {string} id
 * @property {string} type
 * @property {Object[]} attrs
 * @property {number} max_enrollments
 */
const IdentityService = require('fabric-ca-client/lib/IdentityService');


class IdentityServiceBuilder {
	/**
	 *
	 * @param {FabricCAService} caService
	 */
	constructor(caService) {
		this.identityService = new IdentityService(caService._fabricCAClient);
	}

	/**
	 * @param {User} admin
	 * @param {string} enrollmentID
	 * @param {string} [enrollmentSecret]
	 * @param {string} affiliation
	 * @param {string} role
	 * @param {KeyValueAttribute[]} [attrs]
	 * @param [caname]
	 * @param [maxEnrollments]
	 * @return {Promise<string>} The enrollment secret.  If not provided as parameter, a random secret is generated.
	 */
	async create({enrollmentID, enrollmentSecret, affiliation, role, attrs, caname, maxEnrollments}, admin) {
		if (!maxEnrollments) {
			maxEnrollments = -1;
		}
		const allowedType = Object.values(IdentityService.HFCAIdentityType);
		if (!allowedType.includes(role)) {
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

		return this.identityService.create(req, admin);
	}

	/**
	 * update password is supported
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
	async update(admin, {enrollmentID, role, affiliation, maxEnrollments, attrs, enrollmentSecret, caname}) {
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
		return await this.identityService.update(enrollmentID, req, admin);
	}

	/**
	 * no password in return
	 * @param admin
	 * @returns {Promise<Identity[]>}
	 */
	async getAll(admin) {
		const {result, errors, messages, success} = await this.identityService.getAll(admin);
		if (!success) {
			const err = Error('identityService:getAll');
			err.result = result;
			err.errors = errors;
			err.messages = messages;
			throw err;
		}
		const {identities} = result;
		return identities;
	}
}

module.exports = IdentityServiceBuilder;

