const sideDB = require('fabric-client/lib/SideDB');
const {RoleIdentity, simplePolicyBuilder} = require('./policy');
const logger = require('./logger').new('privateData');


/**
 * @typedef {Object} collectionConfig
 * @property {string} name
 * @property policy
 * @property {number} maxPeerCount integer
 * @property {number} requiredPeerCount integer
 * @property {!Long|number|string|!{low: number, high: number, unsigned: boolean}} blockToLive param will be converted to unsigned int64 as Long
 * @property {boolean} memberOnlyRead denotes whether only collection member clients can read the private data
 */

/**
 *
 * @param {collectionConfig} config
 * @return {collectionConfig}
 */
exports.ensureCollectionConfig = (config) => {
	const {name, policy, requiredPeerCount, maxPeerCount, blockToLive = 0, memberOnlyRead = true} = config;
	const {identities} = policy;
	if (requiredPeerCount < identities.length - 1) {
		logger.warn(`[recommend] collectionConfig ${name}:requiredPeerCount > ${identities.length - 2} is suggested in production`);
	}
	return sideDB.checkCollectionConfig({name, policy, requiredPeerCount, maxPeerCount, blockToLive, memberOnlyRead});
};


/**
 * only `OR` is allowed in collection policy, see in https://hyperledger-fabric.readthedocs.io/en/release-1.2/private-data-arch.html
 *  ----
 *  policy: Defines the organization peers allowed to persist the collection data expressed using the Signature policy syntax,
 *      with each member being included in an OR signature policy list.
 *  ----
 *  always:
 *    - "1-of": n===1
 *    - role.name==="member": type===0
 * @param {MspId[]} mspIds array of mspId
 * @return
 */
exports.collectionPolicyBuilder = (mspIds) => {
	const identities = [];
	for (const mspId of mspIds) {
		identities.push(RoleIdentity(mspId, 0));
	}
	return simplePolicyBuilder(identities, 1);
};
