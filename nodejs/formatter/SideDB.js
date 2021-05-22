const fabprotos = require('fabric-protos');
const protosProtos = fabprotos.protos;
const commonProtos = fabprotos.common;
const GatePolicy = require('./gatePolicy');

const gatePolicy = new GatePolicy(fabprotos);

/**
 *
 * @param name
 * @param {integer} required_peer_count
 * @param {integer} [maximum_peer_count]
 * @param {ApplicationPolicy} [endorsement_policy]
 * @param {integer} [block_to_live]
 * @param {boolean} [member_only_read] whether only collection member clients can read the private data
 * @param {boolean} [member_only_write] whether only collection member clients can write the private data
 * @param {MspId[]} member_orgs
 * @return {CollectionConfig}
 */
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
	signaturePolicyEnvelope.rule = rule;
	signaturePolicyEnvelope.identities = identities;

	collectionPolicyConfig.signature_policy = signaturePolicyEnvelope;

	const staticCollectionConfig = new protosProtos.StaticCollectionConfig();
	staticCollectionConfig.name = name;
	staticCollectionConfig.required_peer_count = required_peer_count;
	staticCollectionConfig.maximum_peer_count = maximum_peer_count;
	if (block_to_live) {
		staticCollectionConfig.block_to_live = block_to_live;
	}

	staticCollectionConfig.member_only_write = member_only_write;
	staticCollectionConfig.member_only_read = member_only_read;

	staticCollectionConfig.member_orgs_policy = collectionPolicyConfig;
	if (endorsement_policy) {
		const {channel_config_policy_reference, signature_policy} = endorsement_policy;
		const applicationPolicy = new protosProtos.ApplicationPolicy();

		if (channel_config_policy_reference) {
			applicationPolicy.channel_config_policy_reference = channel_config_policy_reference;
		} else if (signature_policy) {
			applicationPolicy.signature_policy = signature_policy;
		}
		staticCollectionConfig.endorsement_policy = applicationPolicy;
	}

	collectionConfig.static_collection_config = staticCollectionConfig;
	return collectionConfig;
};
/**
 * translator for "collections_config.json"
    [
      {
           "name": "collectionMarbles",
           "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
           "requiredPeerCount": 0,
           "maxPeerCount": 3,
           "blockToLive":1000000,
           "memberOnlyRead": true
      },

      {
           "name": "collectionMarblePrivateDetails",
           "policy": "OR('Org1MSP.member')",
           "requiredPeerCount": 0,
           "maxPeerCount": 3,
           "blockToLive":3,
           "memberOnlyRead": true
      }
    ]
 *
 * @param {[]|string} json
 * @return {CollectionConfig[]}
 */
const FromStandard = (json) => {
	const object = typeof json === 'string' ? JSON.parse(json) : json;
	return object.map(item => {
		const {name, policy: gatePolicyEntry, requiredPeerCount, maxPeerCount, blockToLive, memberOnlyRead, memberOnlyWrite} = item;
		return buildCollectionConfig({
			name,
			maximum_peer_count: maxPeerCount,
			block_to_live: blockToLive,
			member_only_read: memberOnlyRead,
			member_only_write: memberOnlyWrite,
			required_peer_count: requiredPeerCount,
			member_orgs: gatePolicy.FromString(gatePolicyEntry).identities.map(({principal}) => {
				const {msp_identifier} = commonProtos.MSPRole.decode(principal);
				return msp_identifier;
			})
		});
	});
};
module.exports = {
	buildCollectionConfig,
	FromStandard
};
