/**
 * TODO routing to all method
 */
class AffiliationServiceBuilder {
	constructor(caService, logger = console) {
		this.affiliationService = caService.newAffiliationService();
		this.logger = logger;
	}

	/**
	 *
	 * @param name
	 * @param {boolean} force
	 * @param {Client.User} adminUser
	 * @return {Promise<FabricCAServices.IServiceResponse>}
	 */
	async createIfNotExist({name, force}, adminUser) {
		try {
			const resp = await this.affiliationService.getOne(name, adminUser);
			this.logger.info('affiliationService exists', resp.result.name);
			return resp;
		} catch (err) {
			if (err.toString().includes('Failed to get Affiliation')) {
				return await this.affiliationService.create({name, force: !!force}, adminUser);
			} else {
				throw err;
			}
		}
	}
}

module.exports = AffiliationServiceBuilder;