// TODO WIP
const fabprotos = require('fabric-protos');
const {MSPRoleType}  = require('khala-fabric-formatter/constants');
const {ROLE, ORGANIZATION_UNIT, IDENTITY} = fabprotos.common.MSPPrincipal.Classification;
const decodeIdentity = (id_bytes) => {
	const identity = {};

	const proto_identity = fabprotos.msp.SerializedIdentity.decode(id_bytes);
	identity.Mspid = proto_identity.getMspid();
	identity.IdBytes = proto_identity.getIdBytes().toBuffer().toString();

	return identity;
};

const decodeMSPPrincipal = (proto_msp_principal) => {
	let msp_principal = {};
	msp_principal.principal_classification = proto_msp_principal.getPrincipalClassification();
	let proto_principal = null;
	switch (msp_principal.principal_classification) {
		case ROLE:
			proto_principal = fabprotos.common.MSPRole.decode(proto_msp_principal.getPrincipal());
			msp_principal.msp_identifier = proto_principal.getMspIdentifier();
			msp_principal.Role = MSPRoleType[proto_principal.getRole()];
			break;
		case ORGANIZATION_UNIT:
			proto_principal = fabprotos.common.OrganizationUnit.decode(proto_msp_principal.getPrincipal());
			msp_principal.msp_identifier = proto_principal.getMspIdentifier(); // string
			msp_principal.organizational_unit_identifier = proto_principal.getOrganizationalUnitIdentifier(); // string
			msp_principal.certifiers_identifier = proto_principal.getCertifiersIdentifier().toBuffer(); // bytes
			break;
		case IDENTITY:
			msp_principal = decodeIdentity(proto_msp_principal.getPrincipal());
			break;
	}

	return msp_principal;
};
const decodeSignaturePolicy = (proto_signature_policy) => {
	const signature_policy = {};
	signature_policy.Type = proto_signature_policy.Type;
	switch (signature_policy.Type) {
		case 'n_out_of':
			signature_policy.n_out_of = {};
			signature_policy.n_out_of.N = proto_signature_policy.n_out_of.getN();
			signature_policy.n_out_of.rules = [];
			for (const proto_policy of proto_signature_policy.n_out_of.rules) {
				const policy = decodeSignaturePolicy(proto_policy);
				signature_policy.n_out_of.rules.push(policy);
			}
			break;
		case 'signed_by':
			signature_policy.signed_by = proto_signature_policy.getSignedBy();
			break;
	}
	return signature_policy;
};
const decodeSignaturePolicyEnvelope = (signature_policy_envelope_bytes) => {
	const signature_policy_envelope = {};
	const proto_signature_policy_envelope = fabprotos.common.SignaturePolicyEnvelope.decode(signature_policy_envelope_bytes);
	signature_policy_envelope.version = proto_signature_policy_envelope.getVersion();
	signature_policy_envelope.rule = decodeSignaturePolicy(proto_signature_policy_envelope.getRule());
	const proto_identities = proto_signature_policy_envelope.getIdentities();
	if (proto_identities) {
		signature_policy_envelope.identities = proto_identities.map(proto_identity => {
			return decodeMSPPrincipal(proto_identity);
		});
	}


	return signature_policy_envelope;
};
module.exports = {
	decodeIdentity,
	decodeMSPPrincipal,
	decodeSignaturePolicy,
	decodeSignaturePolicyEnvelope
};