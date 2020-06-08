const fabprotos = require('fabric-protos');
const protosProtos = fabprotos.protos;
const commonProtos = fabprotos.common;
const LifecycleProposal = require('../admin/lifecycleProposal');
const Policy = require('../policy');
describe('ApplicationPolicy', () => {
	it('empty SignaturePolicyEnvelope', () => {
		const applicationPolicy = new protosProtos.ApplicationPolicy();
		const envelope = new commonProtos.SignaturePolicyEnvelope();
		const rule = new commonProtos.SignaturePolicy();
		const identities = [];
		const identity = new commonProtos.MSPPrincipal();
		identities.push(identity);
		identity.setPrincipalClassification(0);
		const pricipal = new commonProtos.MSPRole();
		identity.setPrincipal(pricipal.toBuffer());
		pricipal.setMspIdentifier('icddMSP');
		pricipal.setRole(0);

		envelope.setRule(rule);
		envelope.setIdentities(identities);

		applicationPolicy.setSignaturePolicy(envelope);
		console.debug(applicationPolicy);
		applicationPolicy.toBuffer();
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
		const validation_parameter = LifecycleProposal.buildApplicationPolicy({signature_policy});
	});

});
