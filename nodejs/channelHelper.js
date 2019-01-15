const Client = require('./client');
const Peer = require('./peer');

/**
 * connect to a channel given the config of discovery peer and user credentials
 *
 * @param channelName
 * @param discoverPeerUrl: discovery peer URL
 * @param discoverPeerHost: discovery peer hostname
 * @param tlsCaPemPath:  file path of TLS CA certificate for the discovery peer
 * @param userName: name of user that'll be used to connect the given channel
 * @param userMspId: MSP ID of user that'll be used to connect the given channel
 * @param keyPath: file path of private key of user that'll be used to connect the given channel
 * @param certPath: file path of certificate of user that'll be used to connect the given channel
 * @returns {Promise<{client: *, channel: *}>}
 */
exports.connect = async (channelName,
                        {peerUrl, peerHostname, tlsCaPemPath},
                        {username, mspId, keyPath, certPath}) =>{
    const client = await Client.newClientWithUser({username, mspId, keyPath, certPath});
    const discoveryPeer = Peer.buildPeer(client, peerUrl, peerHostname, tlsCaPemPath)
    const channel = await connectChannel(client, channelName, discoveryPeer);
    return {client, channel}
};

/**
 * connect channel enabling service discovery feature
 *
 * @param client
 * @param channelName
 * @param discoveryPeer
 * @returns {Promise<*>}
 */
const connectChannel = async (client, channelName, discoveryPeer ) => {
    const channel = client.newChannel(channelName);
    await channel.initialize({
        discover: true,
        target: discoveryPeer
    });
    return channel;
}