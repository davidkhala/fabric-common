const utf8Decoder = new TextDecoder();

export default class Contract {
	constructor(contract) {
		this.contract = contract;
	}

	/**
	 *
	 * @param {string} name
	 * @param {Array<string|Uint8Array>} args
	 * @returns {Promise<string>}
	 */
	async evaluateTransaction(name, ...args) {
		const evaluateResult = await this.contract.evaluateTransaction(name, ...args);
		return utf8Decoder.decode(evaluateResult);
	}

	/**
	 *
	 * @param {string} name
	 * @param {Array<string|Uint8Array>} args
	 * @returns {Promise<string>}
	 */
	async submitTransaction(name, ...args) {
		const submitResult = await this.contract.submitTransaction(name, ...args);
		return utf8Decoder.decode(submitResult);
	}

}