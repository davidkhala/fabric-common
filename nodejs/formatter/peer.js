/**
 * @param {Client.Peer} peer
 * @return {string}
 */
exports.getName = (peer) => {
	const originName = peer.toString();
	if (originName.includes('://localhost') && peer._options['grpc.ssl_target_name_override']) {
		return peer._options['grpc.ssl_target_name_override'];
	} else {
		return originName;
	}
};