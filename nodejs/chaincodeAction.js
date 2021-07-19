const IdentityContext = require('fabric-common/lib/IdentityContext');
const EventHub = require('khala-fabric-admin/eventHub');
const DefaultEventHubSelector = (hubs) => {
	return hubs[0];
};

class ChaincodeAction {
	constructor(peers, user, channel) {
		this.channel = channel;
		this.identityContext = new IdentityContext(user, null);
		this.endorsers = peers.map(({endorser}) => endorser);
		this.eventers = peers.map(({eventer}) => eventer);
		this.eventSelector = DefaultEventHubSelector;
	}

	setProposalOptions(options) {
		this.proposalOptions = options;
	}

	setCommitOptions(options) {
		this.commitOptions = options;
	}

	setEventOptions(options) {
		this.eventOptions = options;
	}

	setEventSelector(selector) {
		this.eventSelector = selector;
	}

	newEventHubs() {
		return this.eventers.map(eventer => (new EventHub(this.channel, eventer, undefined, this.eventOptions)));
	}

	newEventHub() {
		const eventHubs = this.newEventHubs();
		return this.eventSelector(eventHubs);
	}
}

module.exports = ChaincodeAction;
