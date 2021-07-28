const {transientMapTransform} = require('khala-fabric-formatter/txProposal');

class ContractManager {
	/**
	 *
	 * @param contract
	 * @param {function(Buffer):string|JSON} [bufferToString] result parser
	 */
	constructor(contract, bufferToString = (result) => result.toString()) {
		Object.assign(this, {contract, bufferToString});
	}

	setBufferToString(bufferToString) {
		this.bufferToString = bufferToString;
	}

	/**
	 *
	 * @param {string} fcn
	 * @param {Object} [transientMap]
	 * @param {...string} [args]
	 * @return {Promise<string|JSON>}
	 */
	async evaluateTransaction(fcn, transientMap, ...args) {
		const tx = this.contract.createTransaction(fcn);
		tx.setTransient(transientMapTransform(transientMap));
		const resultBuf = await tx.evaluate(...args);
		return this.bufferToString(resultBuf);
	}

	/**
	 *
	 * @param {string} fcn
	 * @param {Object} [transientMap]
	 * @param {...string} [args]
	 * @return {Promise<string|JSON>}
	 */
	async submitTransaction(fcn, transientMap, ...args) {
		const tx = this.contract.createTransaction(fcn);
		tx.setTransient(transientMapTransform(transientMap));
		const resultBuf = await tx.submit(...args);
		return this.bufferToString(resultBuf);
	}
}

module.exports = ContractManager;