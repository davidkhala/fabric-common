/**
 * channel type, "system|application"
 * @enum {string}
 */
const ChannelType = {
	system: 'system',
	application: 'application'
};
/**
 * fabric node type "orderer|peer"
 * @enum {string}
 */
const NodeType = {
	orderer: 'orderer',
	peer: 'peer'
};
module.exports = {
	ChannelType,
	NodeType
};