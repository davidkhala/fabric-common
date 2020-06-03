const IdentityContext = require('fabric-common/lib/IdentityContext');
const EventHub = require('khala-fabric-admin/eventHub');

class ChaincodeAction {
	constructor(peers, user, channel) {
		this.channel = channel;
		this.identityContext = new IdentityContext(user, null);
		this.endorsers = peers.map(({endorser}) => endorser);
		this.eventers = peers.map(({eventer}) => eventer);
	}

	newEventHubs(options) {
		return this.eventers.map(eventer => (new EventHub(this.channel, eventer, undefined, options)));
	}

	newEventHub(options, selector) {
		const eventHubs = this.newEventHubs(options);
		if (typeof selector !== 'function') {
			selector = (hubs) => {
				return hubs[0];
			};
		}
		return selector(eventHubs);
	}
}

module.exports = ChaincodeAction;
