const Channel = require('fabric-client/lib/Channel');
const {genesis} = require('khala-fabric-formatter/channel');

class ChannelManager {

	constructor({channel, channelName, client}, logger = console) {
		if (channel) {
			this.channel = channel;
		} else {
			if (!channelName) {
				logger.warn('default to using system channel', genesis);
				channelName = genesis;
			}
			this.channel = new Channel(channelName, client);
		}
	}

	setClientContext(clientContext) {
		this.channel._clientContext = clientContext;
	}

	clearOrderers() {
		this.channel._orderers = new Map();
	}

	addOrderer(orderer) {
		this.channel._orderers.set(orderer.getName(), orderer);
	}

	clearPeers() {
		this.channel._channel_peers = new Map();
	}

	build() {
		return this.channel;
	}

	pretty() {
		return {
			client: this.channel._clientContext,
			name: this.channel._name,
			peers: this.channel._channel_peers,
			anchorPeers: this.channel._anchor_peers,
			orderers: this.channel._orderers,
			kafkas: this.channel._kafka_brokers
		};
	}
}

module.exports = ChannelManager;
