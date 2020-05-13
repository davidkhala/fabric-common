const Channel = require('fabric-common/lib/Channel');
const {genesis} = require('khala-fabric-formatter/channel');
const {buildChannelHeader, buildHeader, buildPayload} = require('./protoBuilder');
const fabricProtos = require('fabric-protos');
const ordererProto = fabricProtos.orderer;
const commonProto = fabricProtos.common;

// TODO Test
class ChannelManager {

	constructor({channelName}, channel, logger = console) {
		if (!channel) {
			if (!channelName) {
				logger.warn('default to using system channel', genesis);
				channelName = genesis;
			}
			channel = ChannelManager.emptyChannel(channelName);
		}
		this.channel = channel;
	}




	clearOrderers() {
		this.channel.committers = new Map();
	}

	addOrderer(orderer) {
		this.channel.committers.set(orderer.name, orderer);
	}

	clearPeers() {
		this.channel.endorsers = new Map();
	}

	pretty() {
		return {
			client: this.channel.client,
			name: this.channel.name,
			peers: this.channel.endorsers,
			orderers: this.channel.committers,
		};
	}

	/**
	 * @param {string} channelName
	 * @return {Client.Channel}
	 */
	static emptyChannel(channelName) {
		const client = {
			getClientCertHash: () => Buffer.from(''),
			getConfigSetting: () => undefined
		};
		return new Channel(channelName, client);
	}
}

module.exports = ChannelManager;
