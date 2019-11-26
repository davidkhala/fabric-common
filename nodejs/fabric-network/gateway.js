const {Gateway} = require('fabric-network');

class gateway {
	constructor() {
		this.gateWay = new Gateway();
	}

	/**
	 *
	 * @param {Client} client
	 * @param {string} channelName
	 * @param {Client.Peer} peer
	 * @param {MspId} mspId peer MSP id
	 * @param {Orderer} orderer
	 * @param {boolean} [useDiscovery]
	 * @return {Promise<Network>}
	 */
	async connect(client, channelName, peer, mspId, orderer, useDiscovery) {
		await this.gateWay.connect(client, {wallet: {}, discovery: {enabled: !!useDiscovery}});
		const channel = client.newChannel(channelName);
		channel.addPeer(peer, mspId);
		channel.addOrderer(orderer);
		const network = await this.gateWay.getNetwork(channelName);
		return network;
	}

	disconnect() {
		this.gateWay.disconnect();
	}
}

module.exports = gateway;
