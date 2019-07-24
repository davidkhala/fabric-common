const {Gateway, FileSystemWallet} = require('fabric-network');

class gateway {
	constructor() {
		this.gateWay = new Gateway();
		this.wallet = new FileSystemWallet('./cache');//TODO wallet manager
	}

	/**
	 *
	 * @param {Client} client
	 * @param {string} channelName
	 * @param {Peer} peer
	 * @param {string} mspid peer MSP id
	 * @param {Orderer} orderer
	 * @return {Promise<Network>}
	 */
	async connect(client, channelName, peer, mspid, orderer) {
		await this.gateWay.connect(client, {wallet: this.wallet, discovery: {enabled: false}});
		const channel = client.newChannel(channelName);
		channel.addPeer(peer, mspid);
		channel.addOrderer(orderer);
		const network = await this.gateWay.getNetwork(channelName);
		return network;
	}

	disconnect() {
		this.gateWay.disconnect();
	}
}

module.exports = gateway;
