const sideDB = require('fabric-client/lib/SideDB');
exports.collectionConfig = ({name, policy, requiredPeerCount, maxPeerCount, blockToLive = 0}) => {
	return sideDB.checkCollectionConfig({name, policy, requiredPeerCount, maxPeerCount, blockToLive});
};