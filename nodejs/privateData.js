const {RoleIdentity, simplePolicyBuilder} = require('./policy');
const logger = require('khala-logger/log4js').consoleLogger('privateData');
const {MSPRoleType} = require('khala-fabric-formatter/constants');

/**
 * @typedef {Object} collectionConfig
 * @property {string} name
 * @property policy
 * @property {number} maxPeerCount integer
 * @property {number} requiredPeerCount integer
 * @property {number} [blockToLive]
 * @property {boolean} [memberOnlyRead] denotes whether only collection member clients can read the private data
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
	return checkCollectionConfig({name, policy, requiredPeerCount, maxPeerCount, blockToLive, memberOnlyRead});
};


const checkPolicy = (policyConfig) => {
	if (!policyConfig) {
		throw new Error('Missing Required Param "policy"');
	}
	const {identities, policy} = policyConfig;
	if (!Array.isArray(identities)) {
		throw new Error('Invalid policy, the "identities" property must be an array');
	}

	if (!policy || Object.keys(policy).length === 0) {
		throw new Error('Invalid policy, missing the "policy" property');
	}
};
const checkCollectionConfig = (collectionConfig) => {
	const {
		blockToLive,
		memberOnlyRead,
		name,
		policy,
		maxPeerCount,
		requiredPeerCount,
	} = collectionConfig;

	if (!name || typeof name !== 'string') {
		throw new Error(`CollectionConfig Requires Param "name" of type string, found ${name}(type: ${typeof name})`);
	}

	checkPolicy(policy);
	if (!Number.isInteger(maxPeerCount)) {
		throw new Error(`CollectionConfig Requires Param "maxPeerCount" of type number, found ${maxPeerCount}(type: ${typeof maxPeerCount})`);
	}
	if (!Number.isInteger(requiredPeerCount)) {
		throw new Error(`CollectionConfig Requires Param "requiredPeerCount" of type number, found ${requiredPeerCount}(type: ${typeof requiredPeerCount})`);
	}

	if (maxPeerCount < requiredPeerCount) {
		throw new Error(`CollectionConfig Requires Param "maxPeerCount" bigger than "requiredPeerCount", found maxPeerCount==${maxPeerCount}, requiredPeerCount==${requiredPeerCount}`);
	}

	if (blockToLive < 0) {
		throw new Error(`CollectionConfig Requires Param "blockToLive" positive, found ${blockToLive}(type: ${typeof blockToLive})`);
	}


	return {
		name,
		policy,
		maxPeerCount,
		requiredPeerCount,
		blockToLive,
		memberOnlyRead
	};
};
/**
 * only `OR` is allowed in collection policy, see in https://hyperledger-fabric.readthedocs.io/en/release-1.2/private-data-arch.html
 *  ----
 *  policy: Defines the organization peers allowed to persist the collection data expressed using the Signature policy syntax,
 *      with each member being included in an OR signature policy list.
 *  ----
 *  always:
 *    - "1-of": n===1
 *    - role.name==="member"
 * @param {MspId[]} mspIds array of mspId
 * @return
 */
exports.collectionPolicyBuilder = (mspIds) => {
	const identities = [];
	for (const mspId of mspIds) {
		identities.push(RoleIdentity(mspId, MSPRoleType.member));
	}
	return simplePolicyBuilder(identities, 1);
};
