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
		const resp = await this.getOne(name, this.registrar);
		if (resp) {
			this.logger.info('affiliationService exists', resp.name);
			return resp;
		} else {
			return await this.affiliationService.create({name, force: !!force}, this.registrar);
		}
	}

	async getOne(name) {
		try {
			const {result} = await this.affiliationService.getOne(name, this.registrar);
			return result;
		} catch (e) {
			const {errors} = e;
			if (errors && Array.isArray(errors)) {
				const {code, message} = errors[0];
				if (code === 63 && message === 'Failed to get affiliation: sql: no rows in result set') {
					return undefined;
				}
			}
			throw e;
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