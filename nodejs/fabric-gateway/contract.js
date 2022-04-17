const utf8Decoder = new TextDecoder();

export default class Contract {
	constructor(contract) {
		this.contract = contract;
	}

	async evaluateTransaction(name, ...args) {
		return await this.evaluate([name, ...args]);
	}

	/**
	 *
	 * @param {string[]} args
	 * @param {TransientMap} [transientMap]
	 * @param {MspId[]} [endorsingOrganizations]
	 * @returns {Promise<string>}
	 */
	async evaluate(args, transientMap, endorsingOrganizations) {
		const [name, ...params] = args;
		const result = await this.contract.evaluate(name, {
			arguments: params,
			transientData: transientMap,
			endorsingOrganizations,
		});
		return utf8Decoder.decode(result);
	}

	async submitTransaction(name, ...args) {
		return await this.submit([name, ...args]);
	}

	/**
	 *
	 * @param {string[]} args
	 * @param {TransientMap} [transientMap]
	 * @param {MspId[]} [endorsingOrganizations]
	 * @param {boolean} [finalityRequired] default to true
	 * @returns {Promise<string>}
	 */
	async submit(args, transientMap, endorsingOrganizations, finalityRequired = true) {

		const [name, ...params] = args;

		const method = finalityRequired ? 'submit' : 'submitAsync';
		const submitResult = await this.contract[method](name, {
			arguments: params,
			transientData: transientMap,
			endorsingOrganizations,
		});
		return utf8Decoder.decode(finalityRequired ? submitResult : submitResult.getResult());
	}


}