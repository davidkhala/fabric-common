const logger = require('./logger').new('affiliationService');
exports.createIfNotExist = async (affiliationService, {name, force = false}, adminUser) => {
	try {
		const resp = await affiliationService.getOne(name, adminUser);
		logger.info('affiliationService exists', resp.result.name);
		return resp;
	} catch (err) {
		if (err.toString().includes('Failed to get Affiliation')) {
			return await affiliationService.create({name, force}, adminUser);
		} else {
			throw err;
		}
	}
};
exports.new = (caService) => {
	return caService.newAffiliationService();
};