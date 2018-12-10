/**
 * @typedef {Object} PeerQueryResponse
 * @property {Object} peers_by_org
 * @property {Object} pretty
 */

/**
 *
 * @param client
 * @param peer
 * @returns {Promise<PeerQueryResponse>}
 */
exports.globalPeers = async (client, peer) => {
	const discoveries = client.queryPeers({target: peer, useAdmin: false});
	const {peers_by_org} = discoveries;
	const result = {};
	for (const org in peers_by_org) {
		const {peers} = peers_by_org[org];
		result[org] = {
			mspid: peers[0].mspid,
			peers: peers.map(peer => peer.endpoint)
		};
	}
	discoveries.pretty = result;
	return discoveries;
};


