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
/**
 * @enum
 */
const TxValidationCode = {
	0: 'VALID',
	1: 'NIL_ENVELOPE',
	2: 'BAD_PAYLOAD',
	3: 'BAD_COMMON_HEADER',
	4: 'BAD_CREATOR_SIGNATURE',
	5: 'INVALID_ENDORSER_TRANSACTION',
	6: 'INVALID_CONFIG_TRANSACTION',
	7: 'UNSUPPORTED_TX_PAYLOAD',
	8: 'BAD_PROPOSAL_TXID',
	9: 'DUPLICATE_TXID',
	10: 'ENDORSEMENT_POLICY_FAILURE',
	11: 'MVCC_READ_CONFLICT',
	12: 'PHANTOM_READ_CONFLICT',
	13: 'UNKNOWN_TX_TYPE',
	14: 'TARGET_CHAIN_NOT_FOUND',
	15: 'MARSHAL_TX_ERROR',
	16: 'NIL_TXACTION',
	17: 'EXPIRED_CHAINCODE',
	18: 'CHAINCODE_VERSION_CONFLICT',
	19: 'BAD_HEADER_EXTENSION',
	20: 'BAD_CHANNEL_HEADER',
	21: 'BAD_RESPONSE_PAYLOAD',
	22: 'BAD_RWSET',
	23: 'ILLEGAL_WRITESET',
	24: 'INVALID_WRITESET',
	25: 'INVALID_CHAINCODE',
	254: 'NOT_VALIDATED',
	255: 'INVALID_OTHER_REASON'
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
	PolicyName,
	TxValidationCode
};

