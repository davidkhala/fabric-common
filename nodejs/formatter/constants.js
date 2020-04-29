/**
 * @enum {string}
 */
const ChaincodeProposalCommand = {
	deploy: 'deploy',
	upgrade: 'upgrade'
};

/**
 * @enum {string}
 */
const PolicyName = {
	Readers: 'Readers',
	Writers: 'Writers',
	Admins: 'Admins',
	BlockValidation: 'BlockValidation'
};
/**
 * used in block content
 * @enum {string}
 */
const MSPRoleType = {
	admin: 'ADMIN',
	peer: 'PEER',
	member: 'MEMBER',
	client: 'CLIENT'
};

/**
 * @enum {string}
 */
const OrdererType = {
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
/**
 * @enum {string}
 */
const IdentityType = {
	Role: 'role',
	OrganizationUnit: 'organization-unit',
	Identity: 'identity'
};
module.exports = {
	ChaincodeProposalCommand,
	IdentityType,
	TransactionType,
	MSPRoleType,
	PolicyType,
	PolicyRuleType,
	ImplicitMetaPolicyRule,
	MetricsProvider,
	OrdererType,
	PolicyName
};

