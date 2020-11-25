/**
 * fabric node type "orderer|peer"
 * @enum {string}
 */
const NodeType = {
	orderer: 'orderer',
	peer: 'peer'
};
/**
 * @enum {string}
 */
const MSPType = {
	peerUser: 'peerUser',
	ordererUser: 'ordererUser',
	orderer: 'orderer',
	peer: 'peer'
};
module.exports = {
	NodeType,
	MSPType
};
