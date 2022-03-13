import {BlockNumberFilterType, TxEventFilterType} from 'khala-fabric-formatter/eventHub.js';
import {TxValidationCode} from 'khala-fabric-formatter/constants.js';

const {NEWEST, OLDEST} = BlockNumberFilterType;
const {ALL} = TxEventFilterType;

export default class EventHubQuery {
	/**
	 *
	 * @param eventHub
	 * @param identityContext
	 * @param [logger]
	 */
	constructor(eventHub, identityContext, logger = console) {

		Object.assign(this, {eventHub, identityContext, logger});
	}

	/**
	 *
	 * @param {number} blockNumber Note: NEWEST or OLDEST is not supported so far
	 * @return {Promise<Block>}
	 */
	async getSingleBlock(blockNumber) {

		const {eventHub, identityContext} = this;
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
	}

	async getLastBlock() {
		const {eventHub, identityContext} = this;
		const startBlock = NEWEST;
		eventHub.build(identityContext, {startBlock});
		return await new Promise((resolve, reject) => {
			const listener = (err, {block}) => {
				if (err) {
					reject(err);
				} else {
					resolve(block);
				}
			};
			eventHub.blockEvent(listener, {unregister: true});
			eventHub.connect();
		});
	}

	async waitForBlock(futureSteps = 1) {
		const {eventHub, identityContext, logger} = this;
		eventHub.build(identityContext, {startBlock: NEWEST});
		return await new Promise((resolve, reject) => {
			const futureBlocks = [];
			const callback = (err, event) => {
				if (err) {
					reject(err);
				} else {
					const {block} = event;
					if (futureBlocks.length < futureSteps) {
						logger.debug('currentBlock', block.header.number);
						futureBlocks.push(block);
					} else {
						logger.debug('comingBlock', block.header.number);
						listener.unregisterEventListener();
						resolve(block);
					}

				}

			};
			const listener = eventHub.blockEvent(callback, {unregister: false, startBlock: 0, endBlock: 999});
			eventHub.connect();
		});
	}

	/**
	 *
	 * @return {Promise<{blockNumber, transactionId, status}>}
	 */
	async waitForTx() {
		const {eventHub, identityContext, logger} = this;
		const {transactionId} = identityContext;
		logger.info(`waitForTx[${transactionId}]`);
		// Note identityContext.transactionId will change after `eventHub.build`
		eventHub.build(identityContext, {startBlock: NEWEST});
		return await new Promise((resolve, reject) => {
			const callback = (err, event) => {
				if (err) {
					reject(err);
				} else {
					const {blockNumber, transactionId: txid, status} = event;
					if (status !== TxValidationCode['0']) {
						const error = Error(`Invalid transaction status [${status}]`);
						Object.assign(error, event);
						reject(error);
					} else {
						resolve({blockNumber, transactionId: txid, status});
					}
				}

			};
			eventHub.txEvent(transactionId, callback, {unregister: true});
			eventHub.connect();
		});
	}

	async replayTx(MaxTxAmount, endBlock) {
		const {eventHub, identityContext} = this;
		eventHub.build(identityContext, {startBlock: OLDEST, endBlock});
		return await new Promise((resolve, reject) => {
			const result = [];
			const callback = (err, event) => {
				if (err) {
					listener.unregisterEventListener();
					reject(err);
				} else {
					const {blockNumber, transactionId, status} = event;
					result.push({blockNumber, transactionId, status});

					if (result.length >= MaxTxAmount) {
						listener.unregisterEventListener();
						resolve(result);
					}
				}
			};
			const listener = eventHub.txEvent(ALL, callback, {unregister: false});
			eventHub.connect();
		});
	}
}
