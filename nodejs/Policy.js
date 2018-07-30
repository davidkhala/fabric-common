/*
	{
	    identities: [
	      { role: { name: "member", mspId: "org1" }},
	      { role: { name: "member", mspId: "org2" }}
	    ],
	    policy: {
	      "1-of": [{ "signed-by": 0 }, { "signed-by": 1 }]
	    }
	  }
*/

/*
{
	identities: [
	  { role: { name: "member", mspId: "peerOrg1" }},
	  { role: { name: "member", mspId: "peerOrg2" }},
	  { role: { name: "admin", mspId: "ordererOrg" }}
	],
	policy: {
	  "2-of": [
		{ "signed-by": 2},
		{ "1-of": [{ "signed-by": 0 }, { "signed-by": 1 }]}
	  ]
	}
  }
*/

exports.Policy = require('fabric-client/lib/Policy');
const sideDB = require('fabric-client/lib/SideDB');
exports.simplePolicyBuilder = (identities, n) => {
	return {
		identities,
		policy: {
			[`${n}-of`]: identities.map((e, i) => ({'signed-by': i}))
		}
	};
};

exports.RoleIdentity = (mspId, isAdmin) => ({
	[exports.Policy.IDENTITY_TYPE.Role]: {name: isAdmin ? 'admin' : 'member', mspId}
});
exports.collectionConfig = ({name, policy, requiredPeerCount, maxPeerCount, blockToLive}) => {
	return sideDB.checkCollectionConfig({name, policy, requiredPeerCount, maxPeerCount, blockToLive});
};
exports.collectionConfigs = (collectionConfigs) => {
	const nameSet = [];
	for (const collectionConfig of collectionConfigs) {
		const {name} = collectionConfig;
		if (nameSet.includes(name)) {
			throw Error(`duplicated name: ${name}`);
		} else {
			nameSet.push(name);
		}
	}
	return collectionConfigs;
};
