const Query = require('./query');

const blockWaiter = async (eventHub, minHeight) => {
	const logger = Logger.new('blockWaiter');
	const result = await new Promise((resolve, reject) => {
		const onSucc = ({block, interrupt}) => {
			if (interrupt) {
				resolve({block});
			}
		};
		const onErr = (e) => reject(e);
		let validator;
		if (Number.isSafeInteger(minHeight)) {
			validator = ({block}) => {
				const {number, previous_hash, data_hash} = block.header;
				const {data} = block.data;
				logger.debug('validator', {number, previous_hash, data_hash});
				logger.debug('data viewer', data);
				if (data.length !== 1) {
					return {valid: false, interrupt: true};
				}
				if (number >= minHeight) {
					return {valid: true, interrupt: true};
				} else {
					return {valid: true, interrupt: false};
				}

			};
		}
		eventHub.blockEvent(validator, onSucc, onErr);
	});
	return result.block;
};
exports.blockWaiter = blockWaiter;
exports.nextBlockWaiter = async (eventHub) => {
	const logger = Logger.new('nextBlockWaiter');

	const {peer, channel} = eventHub.pretty();
	const {pretty: {height}} = await Query.chain(peer, channel);
	logger.info(peer.toString(), `current block height ${height}`);// blockHeight indexing from 1
	await blockWaiter(eventHub, height);// blockNumber indexing from 0
};