const fabprotos = require('fabric-protos');
const protosProtos = fabprotos.protos;
const commonProtos = fabprotos.common;
const GatePolicy = require('./gatePolicy');

const gatePolicy = new GatePolicy(fabprotos);


/**
 *
 * @param name
 * @param required_peer_count
 * @param [maximum_peer_count]
 * @param [endorsement_policy]
 * @param [block_to_live]
 * @param {boolean} [member_only_read]
 * @param {boolean} [member_only_write]
 * @param {MspId[]} member_orgs
 * @return {protos.CollectionConfig}
 */
// eslint-disable-next-line max-len
const buildCollectionConfig = ({name, required_peer_count, maximum_peer_count, endorsement_policy, block_to_live, member_only_read, member_only_write, member_orgs}) => {
	if (!maximum_peer_count) {
		maximum_peer_count = required_peer_count;
	}
	if (member_only_read === undefined) {
		member_only_read = true;
	}
	if (member_only_write === undefined) {
		member_only_write = true;
	}
	const collectionConfig = new protosProtos.CollectionConfig();

	// a reference to a policy residing / managed in the config block to define which orgs have access to this collection’s private data
	const collectionPolicyConfig = new protosProtos.CollectionPolicyConfig();
	const signaturePolicyEnvelope = new commonProtos.SignaturePolicyEnvelope();

	const identities = member_orgs.map(mspid => {
		return gatePolicy.buildMSPPrincipal(0, mspid);
	});


	const rules = member_orgs.map((mspid, index) => {
		return gatePolicy.buildSignaturePolicy({signed_by: index});
	});
	const nOutOf = gatePolicy.buildNOutOf({n: 1, rules});
	const rule = gatePolicy.buildSignaturePolicy({n_out_of: nOutOf});
	signaturePolicyEnvelope.setRule(rule);
	signaturePolicyEnvelope.setIdentities(identities);

	collectionPolicyConfig.setSignaturePolicy(signaturePolicyEnvelope);

	const staticCollectionConfig = new protosProtos.StaticCollectionConfig();
	staticCollectionConfig.setName(name);
	staticCollectionConfig.setRequiredPeerCount(required_peer_count);
	staticCollectionConfig.setMaximumPeerCount(maximum_peer_count);
	if (block_to_live) {
		staticCollectionConfig.setBlockToLive(block_to_live);
	}

	staticCollectionConfig.setMemberOnlyWrite(member_only_write);
	staticCollectionConfig.setMemberOnlyRead(member_only_read);

	staticCollectionConfig.setMemberOrgsPolicy(collectionPolicyConfig);
	if (endorsement_policy) {
		// TODO
		staticCollectionConfig.setEndorsementPolicy(endorsement_policy);
	}

	collectionConfig.setStaticCollectionConfig(staticCollectionConfig);
	return collectionConfig;
};

module.exports = {
	buildCollectionConfig
};
