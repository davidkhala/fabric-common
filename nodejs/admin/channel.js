const Channel = require('fabric-common/lib/Channel');
const {genesis} = require('khala-fabric-formatter/channel');
const ServiceAction = require('fabric-common/lib/ServiceAction');
const fabricProtos = require('fabric-protos');
const ordererProto = fabricProtos.orderer;
const commonProto = fabricProtos.common;

// TODO Test
class ChannelManager {

	constructor({channelName, client}, channel, logger = console) {
		if (!channel) {
			if (!channelName) {
				logger.warn('default to using system channel', genesis);
				channelName = genesis;
			}
			channel = new Channel(channelName, client);
		}
		this.channel = channel;
	}

	getGenesisBlock({orderer, user}, identityContext) {

		const signingIdentity = user._signingIdentity;
		const {transactionId: txId, nonce} = identityContext;

		// now build the seek info, will be used once the channel is created
		// to get the genesis block back
		//   build start
		const seekSpecifiedStart = new ordererProto.SeekSpecified();
		seekSpecifiedStart.setNumber(0);
		const seekStart = new ordererProto.SeekPosition();
		seekStart.setSpecified(seekSpecifiedStart);

		//   build stop
		const seekSpecifiedStop = new ordererProto.SeekSpecified();
		seekSpecifiedStop.setNumber(0);
		const seekStop = new ordererProto.SeekPosition();
		seekStop.setSpecified(seekSpecifiedStop);

		// seek info with all parts
		const seekInfo = new ordererProto.SeekInfo();
		seekInfo.setStart(seekStart);
		seekInfo.setStop(seekStop);
		seekInfo.setBehavior(ordererProto.SeekInfo.SeekBehavior.BLOCK_UNTIL_READY);

		// build the header for use with the seekInfo payload
		const seekInfoHeader = this.channel.buildChannelHeader(commonProto.HeaderType.DELIVER_SEEK_INFO, null, txId);

		const serviceAction = new ServiceAction(undefined);

		const idContext = {
			serializeIdentity: signingIdentity.serialize,
			nonce
		};
		const seekHeader = serviceAction.buildHeader(idContext, seekInfoHeader);
		const seekPayload = new commonProto.Payload();
		seekPayload.setHeader(seekHeader);
		seekPayload.setData(seekInfo.toBuffer());
		const payLoad = seekPayload.toBuffer();
		const envelope = {
			signature: Buffer.from(signingIdentity.sign(payload)),
			payLoad
		};

		return orderer.sendDeliver(envelope);
	}

	static setClientContext(channel, clientContext) {
		channel.client = clientContext;
	}

	setClientContext(clientContext) {
		ChannelManager.setClientContext(this.channel, clientContext);
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
		const client = {getClientCertHash: _ => undefined};
		return new Channel(channelName, client);
	}
}

module.exports = ChannelManager;
