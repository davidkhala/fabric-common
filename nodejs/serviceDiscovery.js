/**
 * @typedef {Object} DiscoveryChaincodeCall
 * @property {string} name - The name of the chaincode
 * @property {string[]} collection_names - The names of the related collections
 */

/**
 * @param {Object} configs chaincodeID:string -> collectionNames: string[]
 * @returns {DiscoveryChaincodeCall[]}
 *
 */
exports.discoveryChaincodeInterestBuilder = (configs) => {
	return Object.entries(configs).map(([name, collection_names]) => {
		/**
		 * @type DiscoveryChaincodeCall
		 */
		const discoveryChaincodeCall = {
			name
		};
		if (Array.isArray(collection_names)) {
			discoveryChaincodeCall.collection_names = collection_names;
		}
		return discoveryChaincodeCall;
	});
};
