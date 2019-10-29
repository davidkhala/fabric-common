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


/** consensus "solo|kafka|etcdraft"
 * @enum {string}
 */
const OrdererType = {
	solo: 'solo',
	kafka: 'kafka',
	etcdraft: 'etcdraft'
};
/**
 *
 * @enum {string}
 */
const MetricsProvider = {
	statsd: 'statsd',
	prometheus: 'prometheus',
	undefined: 'disabled',
	null: 'disabled' // value in json file could not be undefined
};
exports.MetricsProvider = MetricsProvider;
exports.OrdererType = OrdererType;
exports.ChannelType = ChannelType;
exports.NodeType = NodeType;
