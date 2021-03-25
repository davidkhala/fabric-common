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

	/**
	 *
	 * @param {Client.User} adminUser
	 */
	async getAll(adminUser) {
		const {result, errors, messages, success} = await this.affiliationService.getAll(adminUser);
		if (!success) {
			const err = Error('affiliation:getAll');
			err.result = result;
			err.errors = errors;
			err.messages = messages;
			throw err;
		}
		const {affiliations} = result;

		return affiliations;
	}
}

module.exports = AffiliationServiceBuilder;