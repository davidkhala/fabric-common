const sideDB = require('fabric-client/lib/SideDB');
exports.collectionConfig = ({name, policy, requiredPeerCount, maxPeerCount, blockToLive}) => {
	return sideDB.checkCollectionConfig({name, policy, requiredPeerCount, maxPeerCount, blockToLive});
};