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

	/**
	 * TODO WIP
	 * FIXME take it as an special case of BlockEvent: set committer as target
	 * @param signingIdentity
	 * @param identityContext
	 * @param {Client.Committer} orderer
	 */
	getGenesisBlock(signingIdentity, identityContext, orderer) {
		const {transactionId, nonce} = identityContext;

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
		const seekInfoHeader = buildChannelHeader({
			ChannelId: this.channel.name,
			Type: commonProto.HeaderType.DELIVER_SEEK_INFO,
			Version: 1,
			TxId: transactionId.toString(),
			TLSCertHash: this.channel.client.getClientCertHash()
		});

		const seekHeader = buildHeader({
			Creator: signingIdentity.serialize(), Nonce: nonce,
			ChannelHeader: seekInfoHeader
		});
		const payload = buildPayload({Header: seekHeader}, seekInfo);
		const envelope = {
			signature: Buffer.from(signingIdentity.sign(payload)),
			payload
		};

		return orderer.sendDeliver(envelope);//TODO sendDeliver is not found
	}

	/**
	 * // TODO WIP
	 * Asks the orderer for the current (latest) configuration block for this channel.
	 * This is similar to [getGenesisBlock()]{@link Channel#getGenesisBlock}, except
	 * that instead of getting block number 0 it gets the latest block that contains
	 * the channel configuration, and only returns the decoded {@link ConfigEnvelope}.
	 *
	 * @returns {Promise} A Promise for a {@link ConfigEnvelope} object containing the configuration items.
	 */
	async getChannelConfigFromOrderer() {
		const method = 'getChannelConfigFromOrderer';
		logger.debug('%s - start for channel %s', method, this._name);

		const self = this;
		const orderer = this._clientContext.getTargetOrderer(null, this.getOrderers(), this._name);

		const signer = this._clientContext._getSigningIdentity(true);
		let txId = new TransactionID(signer, true);

		// seek the latest block
		let seekSpecifiedStart = new _abProto.SeekNewest();
		let seekStart = new _abProto.SeekPosition();
		seekStart.setNewest(seekSpecifiedStart);

		let seekSpecifiedStop = new _abProto.SeekNewest();
		let seekStop = new _abProto.SeekPosition();
		seekStop.setNewest(seekSpecifiedStop);

		// seek info with all parts
		let seekInfo = new _abProto.SeekInfo();
		seekInfo.setStart(seekStart);
		seekInfo.setStop(seekStop);
		seekInfo.setBehavior(_abProto.SeekInfo.SeekBehavior.BLOCK_UNTIL_READY);

		// build the header for use with the seekInfo payload
		let seekInfoHeader = client_utils.buildChannelHeader(
			_commonProto.HeaderType.DELIVER_SEEK_INFO,
			self._name,
			txId.getTransactionID(),
			self._initial_epoch,
			null,
			client_utils.buildCurrentTimestamp(),
			this._clientContext.getClientCertHash()
		);

		let seekHeader = client_utils.buildHeader(signer, seekInfoHeader, txId.getNonce());
		let seekPayload = new _commonProto.Payload();
		seekPayload.setHeader(seekHeader);
		seekPayload.setData(seekInfo.toBuffer());

		// building manually or will get protobuf errors on send
		let envelope = client_utils.toEnvelope(client_utils.signProposal(signer, seekPayload));
		// This will return us a block
		let block = await orderer.sendDeliver(envelope);
		logger.debug('%s - good results from seek block ', method); // :: %j',results);
		// verify that we have the genesis block
		if (block) {
			logger.debug('%s - found latest block', method);
		} else {
			logger.error('%s - did not find latest block', method);
			throw new Error('Failed to retrieve latest block', method);
		}

		logger.debug('%s - latest block is block number %s', block.header.number);
		// get the last config block number
		const metadata = _commonProto.Metadata.decode(block.metadata.metadata[_commonProto.BlockMetadataIndex.LAST_CONFIG]);
		const last_config = _commonProto.LastConfig.decode(metadata.value);
		logger.debug('%s - latest block has config block of %s', method, last_config.index);

		txId = new TransactionID(signer);

		// now build the seek info to get the block called out
		// as the latest config block
		seekSpecifiedStart = new _abProto.SeekSpecified();
		seekSpecifiedStart.setNumber(last_config.index);
		seekStart = new _abProto.SeekPosition();
		seekStart.setSpecified(seekSpecifiedStart);

		//   build stop
		seekSpecifiedStop = new _abProto.SeekSpecified();
		seekSpecifiedStop.setNumber(last_config.index);
		seekStop = new _abProto.SeekPosition();
		seekStop.setSpecified(seekSpecifiedStop);

		// seek info with all parts
		seekInfo = new _abProto.SeekInfo();
		seekInfo.setStart(seekStart);
		seekInfo.setStop(seekStop);
		seekInfo.setBehavior(_abProto.SeekInfo.SeekBehavior.BLOCK_UNTIL_READY);
		// logger.debug('initializeChannel - seekInfo ::' + JSON.stringify(seekInfo));

		// build the header for use with the seekInfo payload
		seekInfoHeader = client_utils.buildChannelHeader(
			_commonProto.HeaderType.DELIVER_SEEK_INFO,
			self._name,
			txId.getTransactionID(),
			self._initial_epoch,
			null,
			client_utils.buildCurrentTimestamp(),
			self._clientContext.getClientCertHash()
		);

		seekHeader = client_utils.buildHeader(signer, seekInfoHeader, txId.getNonce());
		seekPayload = new _commonProto.Payload();
		seekPayload.setHeader(seekHeader);
		seekPayload.setData(seekInfo.toBuffer());

		// building manually or will get protobuf errors on send
		envelope = client_utils.toEnvelope(client_utils.signProposal(signer, seekPayload));
		// this will return us a block
		block = await orderer.sendDeliver(envelope);
		if (!block) {
			throw new Error('Config block was not found');
		}
		// lets have a look at the block
		logger.debug('%s -  config block number ::%s  -- numberof tx :: %s', method, block.header.number, block.data.data.length);
		if (block.data.data.length !== 1) {
			throw new Error('Config block must only contain one transaction');
		}
		envelope = _commonProto.Envelope.decode(block.data.data[0]);
		const payload = _commonProto.Payload.decode(envelope.payload);
		const channel_header = _commonProto.ChannelHeader.decode(payload.header.channel_header);
		if (channel_header.type !== _commonProto.HeaderType.CONFIG) {
			throw new Error(`Block must be of type "CONFIG" (${_commonProto.HeaderType.CONFIG}), but got "${channel_header.type}" instead`);
		}

		const config_envelope = _configtxProto.ConfigEnvelope.decode(payload.data);

		// send back the envelope
		return config_envelope;
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
