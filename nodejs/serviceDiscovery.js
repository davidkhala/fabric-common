exports.pretty = (discoveries) => {
	const {peers_by_org} = discoveries;

	const result = {};
	for (const org in peers_by_org) {
		const {peers} = peers_by_org[org];
		result[org] = {
			mspid: peers[0].mspid,
			peers: peers.map(peer => peer.endpoint)
		};
	}
	return result;
};



