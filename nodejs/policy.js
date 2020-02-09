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
const {IdentityType} = require('./constants');

/**
 *
 * @param {MspId} mspId
 * @param {MSPRoleType} type mixture usage of MEMBER and member
 */
exports.RoleIdentity = (mspId, type) => ({
	[IdentityType.Role]: {name: type.toLowerCase(), mspId}
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



