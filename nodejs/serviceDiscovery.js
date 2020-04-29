const {FabricConfig} = require('./admin/helper');
const logger = require('./logger').new('service discovery', true);
/**
 * @typedef {Object} PeerQueryResponse
 * @property {Object} local_peers
 * @property {Object} pretty
 */

/**
 * @typedef {Object} DiscoveryChaincodeInterest
 * @property {DiscoveryChaincodeCall[]} chaincodes The chaincodes names and collections
 *           that will be sent to the discovery service to calculate an endorsement
 *           plan.
 */

/**
 * @typedef {Object} DiscoveryChaincodeCall
 * @property {string} name - The name of the chaincode
 * @property {string[]} collection_names - The names of the related collections
 */


/**
 *
 * @param client
 * @param peer
 * @returns {Promise<PeerQueryResponse>}
 */
exports.globalPeers = async (client, peer) => {
	const discoveries = await client.queryPeers({target: peer, useAdmin: false});
	const {local_peers} = discoveries;
	const result = {};
	for (const org in local_peers) {
		const {peers} = local_peers[org];
		result[org] = peers.map(p => p.endpoint);
	}
	discoveries.pretty = result;
	return discoveries;
};

/**
 * TODO: inspect the result structure, check the difference from this._discovery_results
 * Return the discovery results.
 * Discovery results are only available if this channel has been initialized.
 * If the results are too old, they will be refreshed
 * @param {Channel} channel
 * @param {DiscoveryChaincodeInterest[]} endorsement_hints - Indicate to discovery
 *        how to calculate the endorsement plans.
 * @returns {Promise<DiscoveryResults>}
 */
exports.getDiscoveryResults = async (channel, endorsement_hints) => {
	return await channel.getDiscoveryResults(endorsement_hints);
};


/**
 * only work as helper to recover channel object, refer to {@link discover}
 *
 * FIXME: sdk doc WARNING
 * In the case when multiple orderers within single host, meanwhile asLocalhost is true, the orderer names will overlap
 *  (all using localhost:7050). It leads to only one orderer is found in channel.getOrderers after channel.initialize
 * @param channel
 * @param peer
 * @param {boolean} asLocalhost   FIXME:ugly undefined checking in fabric-sdk-node
 * @param TLS
 */
exports.initialize = async (channel, peer, {asLocalhost, TLS} = {}) => {
	FabricConfig.set('discovery-protocol', TLS ? 'grpcs' : 'grpc');
	return channel.initialize({target: peer, discover: true, asLocalhost});
};
/**
 * @param {Object} configs chaincodeID -> collectionNames
 * @returns {Client.DiscoveryChaincodeInterest}
 *
 */
exports.endorsementHintsBuilder = (configs) => {
	return {chaincodes: Object.entries(configs).map(([name, collection_names]) => ({name, collection_names}))};
};
exports.discoveryChaincodeCallBuilder = exports.endorsementHintsBuilder;

/**
 *
 * @param channel
 * @param peer
 * @param {Client.DiscoveryChaincodeCall[]} chaincodes
 * @param {boolean} local
 * @returns {Promise<*>}
 */
exports.discover = async (channel, peer, {chaincodes, local}) => {
	const request = {
		target: peer,
		useAdmin: true,
		config: true,
		interests: [{chaincodes}],
		local
	};


	return channel._discover(request);
};
exports.discoverPretty = (result) => {
	const {orderers, peers_by_org, endorsement_plans} = result;
	const prettier = Object.assign({}, result);
	for (const [ordererMSPID, value] of Object.entries(orderers)) {
		logger.debug(value.endpoints);
		prettier.orderers[ordererMSPID] = value.endpoints;
	}
	for (const [peerMSPID, value] of Object.entries(peers_by_org)) {
		prettier.peers_by_org[peerMSPID] = value.peers;
	}
	prettier.endorsement_plans = {};
	for (const {chaincode, groups} of endorsement_plans) {
		prettier.endorsement_plans[chaincode] = {};
		for (const [groupID, group] of Object.entries(groups)) {
			prettier.endorsement_plans[chaincode][groupID] = group.peers;
		}
	}

	return prettier;
};