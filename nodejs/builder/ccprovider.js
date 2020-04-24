const Protobuf = require('./protobuf');
const path = require('path');
const Classification = [
	'ROLE',  // Represents the one of the dedicated MSP roles, the one of a member of MSP network, and the one of an administrator of an MSP network
	'ORGANIZATION_UNIT', // Denotes a finer grained (affiliation-based) grouping of entities, per MSP affiliation E.g., this can well be represented by an MSP's Organization unit
	'IDENTITY',   // Denotes a principal that consists of a single identity
	'ANONYMITY', // Denotes a principal that can be used to enforce an identity to be anonymous or nominal.
	'COMBINED'  // Denotes a combined principal
];

/**
 * See in `lscc.go`
 * ChaincodeData is the response payload (returned by `shim.Success()`) for
 * `(lscc *LifeCycleSysCC) Invoke(stub shim.ChaincodeStubInterface)` when fcn = 'upgrade'
 */
class ChaincodeData {
	constructor(node_modules) {
		const protobuf = new Protobuf(node_modules);
		const extraProtoRoot = path.resolve(node_modules, 'khala-fabric-protos');
		const extraProtobuf = new Protobuf(undefined, extraProtoRoot);
		this.signaturePolicyEnvelopeMessage = protobuf.require('common', 'policies.proto').common.SignaturePolicyEnvelope;
		this.ccdataMessage = extraProtobuf.require('protos', 'core', 'common', 'ccprovider', 'ccprovider.proto').ccprovider.ChaincodeData;
		this.signedCDSDataMessage = extraProtobuf.require('protos', 'core', 'common', 'ccprovider', 'sigcdspackage.proto').ccprovider.SignedCDSData;
	}

	decode(payload) {
		const decoded = this.ccdataMessage.decode(payload);
		const {name, version, escc, vscc, policy, data, id, instantiation_policy} = decoded;


		const decodePolicy = (_policy) => {
			const policyDecoded = this.signaturePolicyEnvelopeMessage.decode(_policy);
			policyDecoded.identities = policyDecoded.identities.map(({principal_classification, principal}) => ({
				principal_classification: Classification[principal_classification],
				principal: principal.toString('utf8').substring(2)
			}));
			return policyDecoded;
		};
		const decodedData = this.signedCDSDataMessage.decode(data);

		for (const [key, value] of Object.entries(decodedData)) {
			decodedData[key] = value.toString('hex');
		}

		return {
			name: name.toString('utf8'),
			version: version.toString('utf8'),
			escc: escc.toString('utf8'),
			vscc: vscc.toString('utf8'),
			policy: decodePolicy(policy),
			data: decodedData,
			id: id.toString('hex'), // See in core/common/ccprovider/sigcdspackage.go#func (ccpack *SignedCDSPackage) getCDSData
			instantiation_policy: decodePolicy(instantiation_policy)
		};
	}
}

module.exports = {
	ChaincodeData
};