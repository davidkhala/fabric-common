const {transientMapTransform} = require('khala-fabric-formatter/txProposal');

class ContractManager {
	/**
	 *
	 * @param contract
	 */
	constructor(contract) {
		this.contract = contract;
	}

	/**
	 *
	 * @param {string} fcn
	 * @param {Object} transientMap
	 * @param {...string} [args]
	 * @return {Promise<string>}
	 */
	async evaluateTransaction(fcn, transientMap, ...args) {
		const tx = this.contract.createTransaction(fcn);
		tx.setTransient(transientMapTransform(transientMap));
		const resultBuf = await tx.evaluate(...args);
		return resultBuf.toString();
	}
	/**
	 *
	 * @param {string} fcn
	 * @param {Object} transientMap
	 * @param {...string} [args]
	 * @return {Promise<string>}
	 */
	async submitTransaction(fcn, transientMap, ...args){
		const tx = this.contract.createTransaction(fcn);
		tx.setTransient(transientMapTransform(transientMap));
		const resultBuf = await tx.submit(...args);
		return resultBuf.toString();
	}
}

module.exports = ContractManager;