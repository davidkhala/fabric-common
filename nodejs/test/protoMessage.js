import fabprotos from 'fabric-protos';
import Policy from '../formatter/policy';
import {BufferFrom} from '../formatter/protobuf';
import assert from 'assert';

const protosProtos = fabprotos.protos;
const commonProtos = fabprotos.common;
const lifeCycleProtos = fabprotos.lifecycle;

describe('ApplicationPolicy', () => {
	it('empty SignaturePolicyEnvelope', () => {
		const applicationPolicy = new protosProtos.ApplicationPolicy();
		const envelope = new commonProtos.SignaturePolicyEnvelope();
		const rule = new commonProtos.SignaturePolicy();
		const identities = [];
		const identity = new commonProtos.MSPPrincipal();
		identities.push(identity);
		identity.principal_classification = 0;
		identity.pricipal = BufferFrom({msp_identifier: 'icddMSP', role: 0}, commonProtos.MSPRole);
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
		const signature_policy = Policy.buildSignaturePolicyEnvelope(endorsementPolicy);
	});

});

describe('protobuf magic', () => {
	const pricipal = new commonProtos.MSPRole();
	pricipal.msp_identifier = 'icddMSP';
	pricipal.role = 0;
	it('should have equal buffer', () => {


		const result1 = BufferFrom(pricipal);
		const result2 = BufferFrom({msp_identifier: 'icddMSP', role: 0}, commonProtos.MSPRole);
		assert.strictEqual(result1.toString(), result2.toString());
	});
	it('should construct an object', () => {
		const result1 = commonProtos.MSPRole.fromObject({msp_identifier: 'icddMSP', role: 0});
		console.debug(result1);
		console.debug(pricipal);
	});
	it('construct an empty', () => {
		const {QueryInstalledChaincodesArgs} = lifeCycleProtos;
		const emptyBuf = QueryInstalledChaincodesArgs.encode({}).finish();

		assert.deepStrictEqual(emptyBuf, Buffer.from(''));

	});

});