const {buildCollectionConfig} = require('khala-fabric-admin/SideDB');
const logger = require('khala-logger/log4js').consoleLogger('privateData');


/**
 * @typedef {Object} collectionConfig
 * @property {MspId[]} identities
 * @property {integer} required_peer_count integer
 * @property {integer} maximum_peer_count integer
 * @property {integer} block_to_live TODO [uint64 block_to_live] should it be a long type
 * @property {boolean} member_only_write whether only collection member clients can write the private data
 * @property {boolean} member_only_read whether only collection member clients can read the private data
 */

/**
 *
 * @param name
 * @param {collectionConfig} config
 */
exports.buildCollectionConfig = (name, config) => {
	const {identities, required_peer_count, maximum_peer_count, block_to_live, member_only_write, member_only_read} = config;
	if (required_peer_count < identities.length - 1) {
		logger.warn(`[recommend] collectionConfig ${name}:requiredPeerCount > ${identities.length - 2} is suggested in production`);
	}
	return buildCollectionConfig({
		name,
		member_only_write,
		member_only_read,
		required_peer_count,
		member_orgs: identities,
		block_to_live, // TODO [uint64 block_to_live] should it be a long type?
		maximum_peer_count,
		// endorsement_policy, // TODO
	});
};

