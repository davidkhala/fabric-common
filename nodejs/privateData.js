const sideDB = require('fabric-client/lib/SideDB');
const {RoleIdentity, simplePolicyBuilder} = require('./policy');
exports.collectionConfig = ({name, policy, requiredPeerCount, maxPeerCount, blockToLive = 0}) => {
	return sideDB.checkCollectionConfig({name, policy, requiredPeerCount, maxPeerCount, blockToLive});
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
 * @param {string[]} mspIds array of mspId
 * @return
 */
exports.collectionPolicyBuilder = (mspIds) => {
	const identities = [];
	for (const mspId of mspIds) {
		identities.push(RoleIdentity(mspId, 0));
	}
	return simplePolicyBuilder(identities, 1);
};
