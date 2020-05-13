/**
 *
 * @enum {string}
 */
const BlockEventFilterType = {
	FULL_BLOCK: 'full', // to receive full blocks
	FILTERED_BLOCK: 'filtered', // to receive filtered blocks
	PRIVATE_BLOCK: 'private'// to receive full blocks and private data
};
/**
 * response.Type
 * @enum {string}
 */
const DeliverResponseType = {
	FULL_BLOCK: 'block',
	FILTERED_BLOCK: 'filtered_block',
	PRIVATE_BLOCK: 'block_and_private_data',
	STATUS: 'status'
};
/**
 * response.status
 * @enum {string}
 */
const DeliverResponseStatus = {
	SUCCESS: 'SUCCESS',
	NOT_FOUND: 'NOT_FOUND'
};
/**
 *
 * @enum {string}
 */
const EventListenerType = {
	BLOCK: 'block', // for block type event listeners
	TX: 'tx', // for transaction type event listeners
	CHAINCODE: 'chaincode' // for chaincode event type event listeners
};
/**
 *
 * @enum {string}
 */
const TxEventFilterType = {
	ALL: 'all' // Special transaction id to indicate that the transaction listener will be notified of all transactions
};
/**
 * Special value for block numbers
 * @enum {string}
 */
const BlockNumberFilterType = {
	NEWEST: 'newest', // what fabric peer sees as newest on the ledger at time of connect
	OLDEST: 'oldest' // what fabric peer sees as oldest on the ledger at time of connect
};
const ErrorSymptom = {
	ByClose: /^EventService has been shutdown by "close\(\)" call$/,
	OnEnd: /^fabric peer service has closed due to an "end" event$/,
	EndBlockSeen: /^Shutdown due to end block number has been seen: \d+$/,
	NewestBlockSeen: /^Newest block received:\d+ status:\w+$/,
	EndBlockOverFlow: /^End block of \d+not received. Last block received \d+$/,
	UnknownStatus: /^Event stream has received an unexpected status message. status:\w+$/,
	UNKNOWNType: /^Event stream has received an unknown response type \w+$/
};

module.exports = {
	BlockEventFilterType,
	EventListenerType,
	TxEventFilterType,
	BlockNumberFilterType,
	ErrorSymptom,
	DeliverResponseType,
	DeliverResponseStatus,
};