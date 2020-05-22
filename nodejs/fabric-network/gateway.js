const {Gateway, DefaultEventHandlerStrategies} = require('fabric-network');
const {NetworkConfig} = require('./NetworkConfig');

class GatewayManager {
	constructor() {
		this.gateWay = new Gateway();
	}

	/**
	 *
	 * @param {Client} client
	 * @param {string} channelName
	 * @param {Client.Peer[]} [peers] not required if use discovery
	 * @param {Orderer} [orderer] not required for evaluate
	 * @param [discoveryOptions] TODO TO test
	 * @param {TxEventHandlerFactory|boolean} strategy
	 *  - true to use default strategy
	 *  - `null` to skip event handling process
	 * @return {Promise<Network>}
	 */
	async connect(client, channelName, peers = [], orderer, discoveryOptions, strategy) {

		if (strategy === true) {
			strategy = DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX;
		}

		if (discoveryOptions) {
			const {mspId, networkConfig, getPeersCallback} = discoveryOptions;
			client._clientConfigMspid = mspId;
			client._network_config = new NetworkConfig(networkConfig, getPeersCallback);
		}
		await this.gateWay.connect(client, {
			wallet: {}, discovery: {enabled: !!discoveryOptions}, transaction: {strategy}
		});


		let channel = client._channels.get(channelName);
		if (!channel) {
			channel = client.newChannel(channelName);
			for (const peer of peers) {
				channel.addPeer(peer);
			}
			if (orderer) {
				channel.addOrderer(orderer);
			}
		}

		const network = await this.gateWay.getNetwork(channelName);
		return network;
	}

	disconnect() {
		this.gateWay.disconnect();
	}
}

module.exports = GatewayManager;
