const AffiliationService = require('fabric-ca-client/lib/AffiliationService.js');

/**
 * TODO routing to all method
 */
class AffiliationServiceBuilder {
	/**
	 *
	 * @param caService
	 * @param adminUser
	 * @param logger
	 */
	constructor(caService, adminUser, logger = console) {
		this.affiliationService = new AffiliationService(caService._fabricCAClient);
		this.logger = logger;
		this.registrar = adminUser;
	}

	/**
	 *
	 * @param name
	 * @param {boolean} [force]
	 * @return {Promise<FabricCAServices.IServiceResponse>}
	 */
	async createIfNotExist(name, force) {
		try {
			const resp = await this.affiliationService.getOne(name, this.registrar);
			this.logger.info('affiliationService exists', resp.result.name);
			return resp;
		} catch (err) {
			if (err.toString().includes('Failed to get affiliation')) {
				return await this.affiliationService.create({name, force: !!force}, this.registrar);
			} else {
				throw err;
			}
		}
	}

	async getAll() {
		const resp = await this.affiliationService.getAll(this.registrar);
		const {result} = resp;

		const {name, affiliations} = result;
		const affiliationsMap = {};
		for (const {name: entryName, affiliations: entry = []} of affiliations) {
			affiliationsMap[entryName] = entry.map(({name: subItem}) => subItem);
		}
		return [affiliationsMap, name];
	}

	async delete(name) {
		await this.affiliationService.delete({name, force: true}, this.registrar);
	}
}

module.exports = AffiliationServiceBuilder;