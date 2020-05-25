const IdentityContext = require('fabric-common/lib/IdentityContext');
const EventHub = require('khala-fabric-admin/eventHub');
class ChaincodeAction {
	constructor(peers, user, channel) {
		this.channel = channel;
		this.identityContext = new IdentityContext(user, null);
		this.endorsers = peers.map(({endorser}) => endorser);
		this.eventers = peers.map(({eventer}) => eventer);
	}

	newEventHub() {
		return new EventHub(this.channel, this.eventers);
	}
}

module.exports = ChaincodeAction;