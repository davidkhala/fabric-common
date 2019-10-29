/**
 * @typedef {string} OrgName organization name (MSPName), mapping to MSP ID
 */
/**
 * @typedef {string} MspId msp_identifier, member service provider identifier
 */

/**
 * An object of a fully decoded protobuf message "Block".
 * A Block may contain the configuration of the channel or transactions on the channel.
 * @typedef {Object} Block
 * @property {BlockHeader} header
 * @property {BlockData} data
 * @property {BlockMetadata} metadata
 */

/**
 * @typedef {Object} BlockHeader
 * @property {number} number - int
 * @property {Buffer} previous_hash
 * @property {Buffer} data_hash
 */

/**
 * @typedef {Object} BlockData
 * @property {{signature:Buffer,payload:BlockDataPayload}[]} data
 */

/**
 * @typedef {Object} BlockDataPayload
 * @property {Header} header {{@link Header}}
 * @property {ConfigEnvelope|Transaction} data {{@link ConfigEnvelope} | {@link Transaction}}
 *
 * @example // TODO
 * <caption>Get the Id of the first transaction in the block:</caption>
 * var tx_id = block.data.data[0].payload.header.channel_header.tx_id;
 */
/**
 * @typedef {Object} BlockMetadata
 * @property {[]} metadata #each array item has it's own layout // TODO what is exact structure
		[0] #SIGNATURES
			signatures -- {{@link MetadataSignature[]}}
		[1] #LAST_CONFIG
			value
				index -- {number}
				signatures -- {{@link MetadataSignature[]}}
		[2] #TRANSACTIONS_FILTER
				{int[]} #see TxValidationCode in proto/peer/transaction.proto
 */
