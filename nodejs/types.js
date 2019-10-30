/**
 * @typedef {string} OrgName organization name (MSPName), mapping to MSP ID
 */
/**
 * @typedef {string} MspId msp_identifier, member service provider identifier
 */
/**
 * @typedef {string} CertificatePem certificate containing the public key in PEM format.
 */

/**
 * An object of a fully decoded protobuf message "Block".
 * A Block may contain the configuration of the channel or endorsing transactions on the channel.
 * @typedef {Object} Block
 * @property {BlockHeader} header
 * @property {{data:BlockData[]}} data
 * @property {{metadata:BlockMetadata}} metadata
 */

/**
 * @typedef {Object} BlockHeader
 * @property {number} number - int
 * @property {Buffer} previous_hash
 * @property {Buffer} data_hash
 */

/**
 * @typedef {Object} BlockData
 * @property {Buffer} signature
 * @property {BlockDataPayload} payload
 */

/**
 * @typedef {Object} BlockDataPayload
 * @property {TxHeader} header
 * @property {ConfigEnvelope|EndorseTransaction} data
 */
/**
 * @typedef {number[]} TransactionsFilter int[], see TxValidationCode in proto/peer/transaction.proto
 */

/**
 * @typedef {Object} LastConfig
 * @property {{index:string|number}} value
 * @property {MetadataSignature[]} signatures
 */

/**
 * @typedef {[{value,signatures:MetadataSignature[]},LastConfig,TransactionsFilter]} BlockMetadata Object[3]
 */

/**
 * A signature over the metadata of a block, to ensure the authenticity of
 * the metadata that describes a Block.
 * @typedef {Object} MetadataSignature
 * @property {SignatureHeader} signature_header
 * @property {Buffer} signature
 */


/**
 * Transaction Header describe basic information about a transaction record, such as its type (configuration update, or endorser transaction, etc.),
 * the id of the channel it belongs to, the transaction id and so on.
 *
 * @typedef {Object} TxHeader
 * @property {ChannelHeader} channel_header
 * @property {SignatureHeader} signature_header
 */

/**
 * @typedef {Object} ChannelHeader
 * @property {number} type
 * @property {number} version
 * @property {string} timestamp
 * @property {string} channel_id
 * @property {string} tx_id
 * @property {string|number} epoch
 * @property {Buffer} extension
 * @property {TransactionType} typeString
 */


/**
 * @typedef {Object} TransactionCreator
 * @property {MspId} Mspid
 * @property {CertificatePem} IdBytes
 */

/**
 * An object that is part of all signatures in Hyperledger Fabric.
 * @typedef {Object} SignatureHeader
 * @property {TransactionCreator}} creator
 * @property {Buffer} nonce - a unique value to guard against replay attacks.
 */


/**
 * A ConfigEnvelope contains the channel configurations data and is the main content of a configuration block.
 * Every block, including the configuration blocks themselves, has a pointer to the latest configuration block, making it easy to query for the
 * latest channel configuration settings.
 * @typedef {Object} ConfigEnvelope
 * @property {{sequence:string|int,channel_group:ConfigGroup}} config
 * @property {{signature:Buffer,payload:{header:TxHeader,data:ConfigUpdateEnvelope}}} last_update
 */


/**
 * @typedef {Object} ConfigUpdateEnvelope
 * @property {{channel_id:string,read_set:ConfigGroup,write_set:ConfigGroup}} config_update
 * @property {MetadataSignature[]} signatures
 */

/**
 * A channel configuration record will have the following object structure.
 * @typedef {Object} ConfigGroup
 * @property {number} version
 * @property {{Orderer:ConfigGroup,Application?:ConfigGroup,OrgName?:ConfigGroup}} groups
 * @property {{?:ConfigValue}} values usual keys:
 * - for global: Consortium|HashingAlgorithm|BlockDataHashingStructure,
 * - for Orderer: ConsensusType|BatchSize|BatchTimeout|ChannelRestrictions
 * - for organization: MSP
 * - for peer organization: AnchorPeers
 * - for all: Capabilities
 * @property {{Admins:ConfigPolicy,Readers:ConfigPolicy,Writers:ConfigPolicy,BlockValidation?:ConfigPolicy}} policies
 * @property {string} mod_policy
 */

/**
 * @typedef {Object} ConfigValue
 * @property {number} version int
 * @property {string} mod_policy
 * @property {ConfigValueContent} value
 */

/**
 * @typedef {Object} ConfigValueContent
 * @property {string} [name] used in HashingAlgorithm|Consortium
 * @property {string[]} [anchor_peers] used in AnchorPeers
 * @property {number} [width] BlockDataHashingStructure
 * @property {number} [type] used in MSP
 * @property {MSPConfigValue} config used in MSP
 */

/**
 * @typedef {Object} MSPConfigValue
 * @property {string} name
 * @property {CertificatePem[]} root_certs
 * @property {CertificatePem[]} intermediate_certs
 * @property {CertificatePem[]} admins
 * @property {CertificatePem[]} revocation_list
 * @property signing_identity
 * @property {CertificatePem[]} organizational_unit_identifiers
 * @property {CertificatePem[]} tls_root_certs
 * @property {CertificatePem[]} tls_intermediate_certs
 *
 */


/**
 * ImplicitMetaPolicy is a policy type which depends on the hierarchical nature of the configuration
 * It is implicit because the rule is generate implicitly based on the number of sub policies with a threshold as in "ANY", "MAJORITY" or "ALL"
 * It is meta because it depends only on the result of other policies
 * <br><br>
 * When evaluated, this policy iterates over all immediate child sub-groups, retrieves the policy
 * of name sub_policy, evaluates the collection and applies the rule.
 * <br><br>
 * For example, with 4 sub-groups, and a policy name of "Readers", ImplicitMetaPolicy retrieves
 * each sub-group, retrieves policy "Readers" for each subgroup, evaluates it, and, in the case of ANY
 * 1 satisfied is sufficient, ALL would require 4 signatures, and MAJORITY would require 3 signatures.
 * @typedef {Object} ImplicitMetaPolicy
 * @property {PolicyType} type type='IMPLICIT_META'
 * @property {{sub_policy:string,rule:ImplicitMetaPolicyRule}} value
 */

/**
 * SignaturePolicy is a recursive message structure which defines a featherweight DSL for describing
 * policies which are more complicated than 'exactly this signature'.
 * @typedef {Object} SignaturePolicy
 * @property {PolicyType} type 'SIGNATURE'
 * @property {{version:number|int, rule:SignaturePolicyRule,identities:SignaturePolicyIdentity[]}} value
 */

/**
 * @typedef {Object} SignaturePolicyIdentity
 * @property {number} principal_classification
 * @property {MspId} msp_identifier
 * @property {MSPRoleType} Role
 */

/**
 * The NOutOf operator is sufficient to express AND as well as OR, as well as of course N out of the following M policies.
 * @typedef {Object} SignaturePolicyRule
 * @property {PolicyRuleType} Type 'n_out_of'
 * @property {{N:number,rules:SignaturePolicyRuleSignedBy[]}} n_out_of
 */
/**
 * SignedBy implies that the signature is from a valid certificate which is signed by the trusted authority
 * @typedef {Object} SignaturePolicyRuleSignedBy
 * @property {PolicyRuleType} Type 'signed_by'
 * @property {number} signed_by
 */

/**
 * @typedef {Object} ConfigPolicy
 * @property {number} version
 * @property {string} mod_policy
 * @property {ImplicitMetaPolicy|SignaturePolicy} policy
 */

/**
 * An endorsement proposal, which includes the name of the chaincode to be invoked and the arguments to be passed to the chaincode.
 *
 * @typedef {Object} ChaincodeInvocationSpec
 * @property {number} type int
 * @property {ChaincodeType} typeString
 * @property {{args:Buffer[],decorations}} input
 * @property {{path:string,name:string,version:string}} chaincode_id
 * @property {number} timeout int
 */

/**
 * @typedef {Object} EndorseTransactionActionPayLoad
 * @property {{input:{chaincode_spec:ChaincodeInvocationSpec}}}} chaincode_proposal_payload
 * @property {{proposal_response_payload:EndorseTransactionProposalResponsePayload,endorsements:Endorsement[]}} action
 */

/**
 * @typedef {Object} EndorseTransactionProposalResponsePayload
 * @property {string|hex} proposal_hash
 * @property {EndorseTransactionProposalResponseExtension} extension
 */

/**
 * @typedef {Object} EndorseTransactionProposalResponseExtension
 * @property {{data_model:number|int,ns_rwset:ReadWriteSet[]}} results
 * @property {ChaincodeEvent} events
 * @property {Client.Response} response
 */

/**
 * @typedef {Object} ReadWriteSet
 * @property {string} namespace
 * @property {{reads:ReadSet[],range_queries_info:[],writes:WriteSet[],metadata_writes:MetadataWriteSet[]}} rwset
 * @property {[]} collection_hashed_rwset // TODO sample required
 */
/**
 * @typedef {Object} ReadSet
 * @property {string} key
 * @property {{block_num:number,tx_num:number}} version
 */
/**
 * @typedef {Object} WriteSet
 * @property {string} key
 * @property {boolean} is_delete
 * @property {string} value
 */
/**
 * @typedef {Object} MetadataWriteSet
 * @property {string} key
 * @property {{name:string,value}[]} entries
 */

/**
 * EndorseTransactionAction contains a chaincode proposal and corresponding proposal responses
 * that encapsulate the endorsing peer's decisions on whether the proposal is considered valid.
 * @typedef {Object} EndorseTransactionAction
 * @property {SignatureHeader} header
 * @property {EndorseTransactionActionPayLoad} payload
 */

/**
 * An endorsement is a signature of an endorser over a proposal response. By producing an endorsement message,
 * an endorser implicitly "approves" that proposal response and the actions contained therein. When enough endorsements have been collected,
 * a transaction can be generated out of a set of proposal responses
 *
 * @typedef {Object} Endorsement
 * @property {TransactionCreator} endorser
 * @property {Buffer} signature
 */

/**
 * An Endorser Transaction, is the result of invoking chaincodes to collect endorsements, getting globally ordered in the context of a channel,
 * and getting validated by the committer peer as part of a block before finally being formally "committed" to the ledger inside a Block.
 * <br><br>
 * Note that even if a transaction proposal(s) is considered valid by the endorsing peers, it may still be rejected by the committers during
 * transaction validation. Whether a transaction as a whole is valid or not, is not reflected in the transaction record itself,
 * but rather recorded in a separate field in the Block's metadata.

 * @typedef {Object} EndorseTransaction
 * @property {EndorseTransactionAction[]} actions These represent different steps for executing a transaction,
 * and those steps will be processed atomically, meaning if any one step failed then the whole transaction will be marked as rejected.
 */

