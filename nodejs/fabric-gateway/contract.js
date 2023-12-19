const utf8Decoder = new TextDecoder();

export default class Contract {
	constructor(contract, subContractName) {
		this.contract = contract;
		this.subContract = subContractName;
	}

	async evaluateTransaction(...args) {
		return await this.evaluate(args);
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
		const result = await this.contract.evaluate(this.getFcn(name), {
			arguments: params,
			transientData: transientMap,
			endorsingOrganizations,
		});
		return utf8Decoder.decode(result);
	}

	async submitTransaction(...args) {
		return await this.submit(args);
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
		const submitResult = await this.contract[method](this.getFcn(name), {
			arguments: params,
			transientData: transientMap,
			endorsingOrganizations,
		});
		return utf8Decoder.decode(finalityRequired ? submitResult : submitResult.getResult());
	}

	getFcn(name) {
		if (this.subContract) {
			return `${this.subContract}:${name}`;
		}
		return name;
	}

}