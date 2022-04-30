import IdentityContext from 'fabric-common/lib/IdentityContext.js';
import EventHub from 'khala-fabric-admin/eventHub.js';

const DefaultEventHubSelector = (hubs) => {
	return hubs[0];
};

export default class ChaincodeAction {
	constructor(peers, user, channel) {
		this.channel = channel;
		this.identityContext = new IdentityContext(user, null);
		this.endorsers = peers.map(({endorser}) => endorser);
		this.eventers = peers.map(({eventer}) => eventer);
		this.eventSelector = DefaultEventHubSelector;
	}

	async connect(type) {
		if (type) {
			for (const endpoint of this[type]) {
				await endpoint.connect();
			}
			return;
		}
		for (const endorser of this.endorsers) {
			await endorser.connect();
		}
		for (const eventer of this.eventers) {
			await eventer.connect();
		}

	}

	async disconnect(type) {
		if (type) {
			for (const endpoint of this[type]) {
				await endpoint.disconnect();
			}
			return;
		}
		for (const endorser of this.endorsers) {
			await endorser.disconnect();
		}
		for (const eventer of this.eventers) {
			await eventer.disconnect();
		}
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
