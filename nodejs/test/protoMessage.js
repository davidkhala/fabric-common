const fabprotos = require('fabric-protos');
const protosProtos = fabprotos.protos;
const commonProtos = fabprotos.common;
const LifecycleProposal = require('../admin/lifecycleProposal');
const Policy = require('../formatter/policy');
describe('ApplicationPolicy', () => {
	it('empty SignaturePolicyEnvelope', () => {
		const applicationPolicy = new protosProtos.ApplicationPolicy();
		const envelope = new commonProtos.SignaturePolicyEnvelope();
		const rule = new commonProtos.SignaturePolicy();
		const identities = [];
		const identity = new commonProtos.MSPPrincipal();
		identities.push(identity);
		identity.principal_classification = 0;
		const pricipal = new commonProtos.MSPRole();
		pricipal.msp_identifier = 'icddMSP';
		pricipal.role = 0;
		identity.pricipal = commonProtos.MSPRole.encode(pricipal).finish();

		envelope.rule = rule;
		envelope.identities = identities;

		applicationPolicy.signature_policy = envelope;
	});
	it('e2e', () => {
		const endorsementPolicy = {
			identities: [
				{role: {type: 0, mspid: 'org1msp'}},
				{role: {type: 0, mspid: 'org2msp'}}
			],
			policy: {
				'1-of': [{signedBy: 0}, {signedBy: 1}]
			}
		};
		const policy = new Policy(LifecycleProposal.getFabprotos());
		const signature_policy = policy.buildSignaturePolicyEnvelope(endorsementPolicy);
	});

});
