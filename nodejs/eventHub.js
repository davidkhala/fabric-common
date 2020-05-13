const {BlockNumberFilterType: {NEWEST}} = require('khala-fabric-formatter/eventHub');
/**
 *
 * @param eventHub
 * @param identityContext
 * @param {number} blockNumber Note: NEWEST or OLDEST is not supported so far
 * @return {Promise<Block>}
 */
const getSingleBlock = async (eventHub, identityContext, blockNumber) => {
	const startBlock = blockNumber;
	const endBlock = blockNumber;
	eventHub.build(identityContext, {startBlock, endBlock});

	return await new Promise((resolve, reject) => {
		const listener = (err, info) => {
			if (info) {
				if (parseInt(info.block.header.number) === blockNumber) {
					resolve(info.block);
				}
			}
		};
		eventHub.blockEvent(listener, {unregister: true, startBlock, endBlock});
		eventHub.connect();
	});
};
const getLastBlock = async (eventHub, identityContext) => {
	const startBlock = NEWEST;
	const endBlock = NEWEST;
	eventHub.build(identityContext, {startBlock, endBlock});
	return await new Promise((resolve, reject) => {
		const listener = (err, info) => {
			if (info) {
				console.log(info);
			}
		};
		eventHub.blockEvent(listener);
		eventHub.connect();
	});
};
module.exports = {
	getSingleBlock,
	getLastBlock
};