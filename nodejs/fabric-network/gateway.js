const {Gateway, DefaultEventHandlerStrategies} = require('fabric-network');
const Client = require('fabric-common/lib/Client');
const IdentityContext = require('fabric-common/lib/IdentityContext');
const {SigningIdentity} = require('./signingIdentity');

class GatewayManager {
	constructor(user) {
		this.gateWay = new Gateway();
		this.client = new Client(null);
		this.setIdentity(user);
	}

	setIdentity(user) {
		const identity = new SigningIdentity(user._signingIdentity);

		this.gateWay.identity = identity;
		this.gateWay.identityContext = new IdentityContext(user, this.client);
	}

	/**
	 *
	 * @param {string} channelName
	 * @param {Peer[]} [peers]
	 * @param {Orderer} [orderer] not required for evaluate
	 * @param [discoveryOptions] TODO TO test
	 * @param {TxEventHandlerFactory|boolean} strategy
	 *  - true to use default strategy
	 *  - `null` to skip event handling process
	 * @return {Promise<Network>}
	 */
	async connect(channelName, peers = [], orderer, discoveryOptions, strategy) {

		const {client} = this;

		if (strategy === true) {
			strategy = DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX;
		}

		if (discoveryOptions) {
			// const {mspId, networkConfig, getPeersCallback} = discoveryOptions;
			// client._clientConfigMspid = mspId;
			// client._network_config = new NetworkConfig(networkConfig, getPeersCallback);
			throw Error('WIP');
		}


		const channel = client.newChannel(channelName);
		client.channels.set(channelName, channel);


		for (const peer of peers) {
			const {endorser} = peer;
			channel.endorsers.set(endorser.toString(), endorser);
		}
		if (orderer) {
			const {committer} = orderer;
			channel.committers.set(committer.toString(), committer);
		}

		const {identity} = this.gateWay;
		await this.gateWay.connect(client, {
			wallet: {}, discovery: {enabled: !!discoveryOptions}, transaction: {strategy}, identity
		});

		const network = await this.gateWay.getNetwork(channelName);
		return network;
	}

	disconnect() {
		this.gateWay.disconnect();
	}
}

module.exports = GatewayManager;
