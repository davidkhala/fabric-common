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

/**
 * TODO: inspect the result structure
 * Return the discovery results.
 * Discovery results are only available if this channel has been initialized.
 * If the results are too old, they will be refreshed
 * @param {Channel} channel
 * @param {DiscoveryChaincodeInterest[]} endorsement_hints - Indicate to discovery
 *        how to calculate the endorsement plans.
 * @returns {Promise<DiscoveryResults>}
 */
exports.getDiscoveryResults = async (channel, endorsement_hints) => {
	return channel.getDiscoveryResults(endorsement_hints);
};
