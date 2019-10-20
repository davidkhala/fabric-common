/**
 * @typedef {string} OrgName organization name (MSPName), mapping to MSP ID
 */
/**
 * @typedef {string} MspId msp_identifier, member service provider identifier
 */
/**
 * channel type, "system|application"
 * @enum {string}
 */
const ChannelType = {
	system: 'system',
	application: 'application'
};


/** consensus "solo|kafka|etcdraft"
 * @enum {string}
 */
const OrdererType = {
	solo: 'solo',
	kafka: 'kafka',
	etcdraft: 'etcdraft'
};
exports.OrdererType = OrdererType;
exports.ChannelType = ChannelType;