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

/**
 * @enum {string}
 */
const MSPRoleType = {
	admin: 'ADMIN',
	peer: 'PEER',
	member: 'MEMBER'
};

/** 'solo' is now taken as a special case of 'etcdraft'
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
/**
 * @enum {string}
 */
const ImplicitMetaPolicyRule = {
	ANY: 'ANY',
	ALL: 'ALL',
	MAJORITY: 'MAJORITY'
};
/**
 * @enum {string}
 */
const TransactionType = {
	ENDORSER_TRANSACTION: 'ENDORSER_TRANSACTION',
	CONFIG: 'CONFIG'
};
/**
 * @enum {string}
 */
const PolicyType = {
	IMPLICIT_META: 'IMPLICIT_META',
	SIGNATURE: 'SIGNATURE'
};
/**
 * @enum {string}
 */
const PolicyRuleType = {
	n_out_of: 'n_out_of',
	signed_by: 'signed_by'
};
exports.TransactionType = TransactionType;
exports.MSPRoleType = MSPRoleType;
exports.PolicyType = PolicyType;
exports.PolicyRuleType = PolicyRuleType;
exports.ImplicitMetaPolicyRule = ImplicitMetaPolicyRule;
exports.MetricsProvider = MetricsProvider;
exports.OrdererType = OrdererType;
exports.ChannelType = ChannelType;
exports.NodeType = NodeType;
