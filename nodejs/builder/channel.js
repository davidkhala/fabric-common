const Channel = require('fabric-client/lib/Channel');
const {SYSTEM_CHANNEL_NAME} = require('fabric-client/lib/Constants');

class ChannelManager {

	constructor({channelName, client}, channel, logger = console) {
		if (!channel) {
			if (!channelName) {
				logger.warn('default to using system channel', SYSTEM_CHANNEL_NAME);
				channelName = SYSTEM_CHANNEL_NAME;
			}
			channel = new Channel(channelName, client);
		}
		this.channel = channel;
	}

	static setClientContext(channel, clientContext) {
		channel._clientContext = clientContext;
	}

	setClientContext(clientContext) {
		ChannelManager.setClientContext(this.channel, clientContext);
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

	/**
	 * @param {string} channelName
	 * @return {Client.Channel}
	 */
	static emptyChannel(channelName) {
		const client = {getClientCertHash: _ => undefined};
		return new Channel(channelName, client);
	}
}

module.exports = ChannelManager;
