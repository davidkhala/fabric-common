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

module.exports = {
	BlockEventFilterType,
	EventListenerType,
	TxEventFilterType,
	BlockNumberFilterType
};