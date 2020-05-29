const fabprotos = require('fabric-protos');
const protosProtos = fabprotos.protos;
const commonProtos = fabprotos.common;
const GatePolicy = require('./gatePolicy');
// message StaticCollectionConfig {
//     string name = 1;
//     // a reference to a policy residing / managed in the config block
//     // to define which orgs have access to this collection’s private data
//     CollectionPolicyConfig member_orgs_policy = 2;
//     int32 required_peer_count = 3;
//     // The maximum number of peers that private data will be sent to
//     // upon endorsement. This number has to be bigger than required_peer_count.
//     int32 maximum_peer_count = 4;
//     // The number of blocks after which the collection data expires.
//     // For instance if the value is set to 10, a key last modified by block number 100
//     // will be purged at block number 111. A zero value is treated same as MaxUint64
//     uint64 block_to_live = 5;
//     // The member only read access denotes whether only collection member clients
//     // can read the private data (if set to true), or even non members can
//     // read the data (if set to false, for example if you want to implement more granular
//     // access logic in the chaincode)
//     bool member_only_read = 6;
//     // The member only write access denotes whether only collection member clients
//     // can write the private data (if set to true), or even non members can
//     // write the data (if set to false, for example if you want to implement more granular
//     // access logic in the chaincode)
//     bool member_only_write = 7;
//     // a reference to a policy residing / managed in the config block
//     // to define the endorsement policy for this collection
//     ApplicationPolicy endorsement_policy= 8;
// }

const gatePolicy = new GatePolicy(fabprotos);

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
