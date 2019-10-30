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
const MSPRoleType = ['member', 'admin', 'client', 'peer'];

// TODO not to use index any more
exports.RoleIdentity = (mspId, typeIndex) => ({
	[exports.Policy.IDENTITY_TYPE.Role]: {name: MSPRoleType[typeIndex], mspId}
});

exports.simplePolicyBuilder = (identities, n) => {
	return {
		identities,
		policy: {
			[`${n}-of`]: identities.map((e, i) => ({'signed-by': i}))
		}
	};
};
exports.configtxPolicies = {
	implicit: {
		Policies: {
			Readers: {
				Type: 'ImplicitMeta',
				Rule: 'ANY Readers'
			},
			Writers: {
				Type: 'ImplicitMeta',
				Rule: 'ANY Writers'
			},
			Admins: {
				Type: 'ImplicitMeta',
				Rule: 'MAJORITY Admins'
			}
		}
	}
};



