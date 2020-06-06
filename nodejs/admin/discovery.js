const DiscoveryService = require('fabric-common/lib/DiscoveryService');
const {emptyChannel} = require('./channel');
const fabprotos = require('fabric-protos');


class SlimDiscoveryService extends DiscoveryService {

	constructor(channelName, discoverer) {
		super('-', emptyChannel(channelName));
		delete this.refreshAge;

		delete this.discoveryResults;
		delete this.asLocalhost;
		delete this.targets;
		delete this.setTargets;

		this.setDiscoverer(discoverer);
	}

	setDiscoverer(discoverer) {
		this.currentTarget = discoverer;
	}

	async send(request = {}) {
		const {requestTimeout = this.requestTimeout, target = this.currentTarget} = request;

		const signedEnvelope = this.getSignedEnvelope();
		const response = await target.sendDiscovery(signedEnvelope, requestTimeout);
		if (response instanceof Error) {
			throw response;
		}
		return response;
	}

	build(idContext, {config = null, local = null, interest, endorsement, onlineSign = true}) {
		if (config) {
			local = false; // otherwise we will have multiple result with type 'members'
		}
		const result = super.build(idContext, {config, local, interest, endorsement});
		if (onlineSign) {
			super.sign(idContext);
		}
		return result;
	}

	static ParsePeerResult({identity, membership_info, state_info}) {
		const peer = {};
		// IDENTITY
		const q_identity = fabprotos.msp.SerializedIdentity.decode(identity);
		peer.mspid = q_identity.mspid;

		// MEMBERSHIP - Peer.membership_info
		// gossip.Envelope.payload
		const q_membership_message = fabprotos.gossip.GossipMessage.decode(membership_info.payload);
		peer.endpoint = q_membership_message.alive_msg.membership.endpoint;

		// STATE
		if (state_info) {
			const message_s = fabprotos.gossip.GossipMessage.decode(state_info.payload);
			peer.ledger_height = message_s.state_info.properties.ledger_height.toInt();
			peer.chaincodes = message_s.state_info.properties.chaincodes.map((q_chaincode) => (
				{
					name: q_chaincode.getName(),
					version: q_chaincode.getVersion(),
				}
			));
		}
		return peer;
	}
}

module.exports = SlimDiscoveryService;
