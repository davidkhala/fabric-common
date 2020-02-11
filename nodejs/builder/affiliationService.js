class AffiliationServiceBuilder {
	constructor(caService, logger = console) {
		this.affiliationService = caService.newAffiliationService();
		this.logger = logger;
	}

	async createIfNotExist({name, force = false}, adminUser) {
		try {
			const resp = await this.affiliationService.getOne(name, adminUser);
			this.logger.info('affiliationService exists', resp.result.name);
			return resp;
		} catch (err) {
			if (err.toString().includes('Failed to get Affiliation')) {
				return await this.affiliationService.create({name, force}, adminUser);
			} else {
				throw err;
			}
		}
	}
}

module.exports = AffiliationServiceBuilder;