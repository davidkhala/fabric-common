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
	 * @returns {Promise<string>}
	 */
	async submit(args, transientMap, endorsingOrganizations) {

		const [name, ...params] = args;
		const submitResult = await this.contract.submit(name, {
			arguments: params,
			transientData: transientMap,
			endorsingOrganizations,
		});

		return utf8Decoder.decode(submitResult);
	}

}