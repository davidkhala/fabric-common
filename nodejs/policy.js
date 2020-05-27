/**
 * @typedef {Object} RoleIdentity
 * @property {{type: integer, mspid: MspId}} [role]
 */


/**
 * @typedef {Object} Policy
 * @property {RoleIdentity[]} identities
 * @property {Object} policy Recursive policy object
 * @example
 * {
	    identities: [
	      { role: { type: 0, mspid: "org1msp" }},
	      { role: { type: 0, mspid: "org2msp" }}
	    ],
	    policy: {
	      "1-of": [{ signedBy: 0 }, { signedBy: 1 }]
	    }
	  }
 */

/**
 * @typedef {Object} PolicyElement
 * @property {PolicyElement[]} [n-of]
 * @property {integer|MSPRoleType} [signedBy]
 */


class Policy {
	/**
	 * FIXME
	 * MAGIC CODE for [Illegal value for versionvalue element of type int32: object (not an integer)]
	 * Note Please use same dependency object with protos.ApplicationPolicy
	 * Otherwise grpc message wire will crash magically
	 * @param fabprotos = require('fabric-protos')
	 */
	constructor(fabprotos) {
		this.commonProto = fabprotos.common;
	}

	/**
	 *
	 * @param {Policy} policy
	 * @return {Buffer}
	 */
	buildSignaturePolicyEnvelope(policy) {
		const envelope = new this.commonProto.SignaturePolicyEnvelope();
		const principals = policy.identities.map((identity) => this.buildPrincipal(identity));

		const thePolicy = this.parsePolicy(policy.policy);

		envelope.setVersion(0);
		envelope.setRule(thePolicy);
		envelope.setIdentities(principals);

		return envelope;
	}

	buildPrincipal(identity) {
		const {commonProto} = this;
		const {type, mspid} = identity.role;

		const newPrincipal = new commonProto.MSPPrincipal();
		newPrincipal.setPrincipalClassification(commonProto.MSPPrincipal.Classification.ROLE);
		const newRole = new commonProto.MSPRole();
		newRole.setRole(type);
		newRole.setMspIdentifier(mspid);

		newPrincipal.setPrincipal(newRole.toBuffer());


		return newPrincipal;
	}

	parsePolicy(spec) {
		const {commonProto} = this;
		const signedByConfig = spec.signedBy;
		const signaturePolicy = new commonProto.SignaturePolicy();
		if (signedByConfig || signedByConfig === 0) {
			if (signedByConfig === 0) {
				signaturePolicy.Type = 'signed_by';
			}
			signaturePolicy.setSignedBy(signedByConfig);
		} else {
			const key = Object.keys(spec)[0];
			const array = spec[key];
			const n = key.match(/^(\d+)-of$/)[1];

			const nOutOf = new commonProto.SignaturePolicy.NOutOf();
			nOutOf.setN(parseInt(n));

			const subs = array.map((sub) => this.parsePolicy(sub));

			nOutOf.setRules(subs);

			signaturePolicy.setNOutOf(nOutOf);
		}
		return signaturePolicy;
	}
}


module.exports = Policy;

