const {TransactionType} = require('../constants');
// TODO new function: parse nonce and re-create transactionid

/**
 * @param {Block} block
 * @return {TransactionType}
 */
const classify = (block) => {

	let transactionType;
	const blockDatas = block.data.data;
	if (blockDatas.length > 1) {
		transactionType = TransactionType.ENDORSER_TRANSACTION;
	} else {
		const {config} = blockDatas[0].payload.data;
		if (config) {
			transactionType = TransactionType.CONFIG;
		} else {
			transactionType = TransactionType.ENDORSER_TRANSACTION;
		}
	}
	return transactionType;
};
module.exports = {
	classify,
};