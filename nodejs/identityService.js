const IdentityService = require('fabric-ca-client/lib/IdentityService');
const logger = require('./logger').new('IdentityService');
exports.create = async (identityService, admin, {
	enrollmentID, enrollmentSecret, affiliation, role, attrs, caname,
	maxEnrollments = -1,
}) => {
	const allowedType = Object.values(IdentityService.HFCAIdentityType);
	if (!allowedType.includes(role)) {
		throw Error(`invalid role:${role},should be one of ${allowedType}`);
	}
	const req = {
		enrollmentID,
		enrollmentSecret,
		affiliation,
		type: role,
		maxEnrollments,
		attrs,
		caname,
	};

	return await identityService.create(req, admin);
};
/**
 * no password in return
 * @param identityService
 * @param admin
 * @returns {Promise<any>}
 */
exports.getAll = async (identityService, admin) => {
	const result = await identityService.getAll(admin);
	return result.identities;
};
/**
 * update password is supported
 * @param identityService
 * @param admin
 * @param enrollmentID
 * @param role
 * @param affiliation
 * @param maxEnrollments
 * @param attrs
 * @param enrollmentSecret
 * @param caname
 * @returns {Promise<*>}
 */
exports.update = async (identityService, admin, {enrollmentID,role, affiliation, maxEnrollments, attrs, enrollmentSecret, caname}) => {
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
	const result = await identityService.update(enrollmentID, req, admin);

	logger.debug(result);
	return result;
};

exports.new = (caService) => {
	return caService.newIdentityService();
};

