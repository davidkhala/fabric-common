const Logger = require('./logger');
const logger = Logger.new('eventHub');
const ChannelEventHub = require('fabric-client/lib/ChannelEventHub');
const Query = require('./query');
exports.unRegisterAllEvents = (eventHub) => {
	eventHub._chaincodeRegistrants = new Map();
	eventHub._blockOnEvents = {};

	eventHub._blockOnErrors = {};
	eventHub._transactionOnEvents = {};
	eventHub._transactionOnErrors = {};
};
/**
 * @param {Client.Channel} channel
 * @param {Client.Peer} peer
 * @param {boolean} inlineConnected
 * @returns {ChannelEventHub}
 */
exports.newEventHub = (channel, peer, inlineConnected) => {
	const eventHub = new ChannelEventHub(channel, peer);
	logger.debug('new', {channel: channel.getName(), peer: peer.toString()});
	if (inlineConnected) {
		eventHub.connect(true);
	}
	return eventHub;
};
/**
 *
 * Disconnects the ChannelEventHub from the peer event source.
 * Will close all event listeners and send an Error object
 * with the message "ChannelEventHub has been shutdown" to
 * all listeners that provided an "onError" callback.
 * @param {ChannelEventHub} eventHub
 */
const disconnect = (eventHub) => {
	if (eventHub.checkConnection(false) && eventHub.isconnected() && !eventHub._disconnect_running) {
		const {channel, peer} = pretty(eventHub);
		logger.debug('disconnect', {peer: peer.toString(), channel: channel.getName()});
		eventHub.disconnect();
	}
};
exports.disconnect = disconnect;
const pretty = (eventHub) => {
	return {
		isConnected: eventHub._connected,
		client: eventHub._clientContext,
		peer: eventHub._peer,
		channel: eventHub._channel
	};
};
exports.pretty = pretty;
/**
 * @typedef {boolean} ToInterrupt Expected listener status
 */
/**
 * @callback OnEvenHubError
 * @param {Error} err
 */
/**
 * @callback OnBlockEventSuccess
 * @param block
 */
/**
 * @callback OnChaincodeEventSuccess
 * @param {ChaincodeEvent} chaincodeEvent
 * @param {number} blockNum int number
 * @param {string} status
 */
/**
 * @callback Validator
 * @param {ToInterrupt} [interrupt]
 * @return {{valid: boolean, interrupt: boolean}}
 */
/**
 *
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {OnChaincodeEventSuccess&Validator} validator
 * @param {string} chaincodeId
 * @param {string|RegExp} eventName
 * @param {OnChaincodeEventSuccess} onSuccess
 * @param {OnEvenHubError} onError
 * @returns {ChaincodeChannelEventHandle}
 */
exports.chaincodeEvent = (eventHub, validator, {chaincodeId, eventName}, onSuccess, onError) => {
	const logger = Logger.new('chaincodeEvent', true);
	if (!validator) {
		validator = (chaincodeEvent, blockNum, status) => {
			logger.debug('default validator', {chaincodeEvent, blockNum, status});
			return {valid: true, interrupt: true};
		};
	}
	const listener = eventHub.registerChaincodeEvent(chaincodeId, eventName, (chaincodeEvent, blockNum, txId, status) => {
		blockNum = parseInt(blockNum);
		const {payload} = chaincodeEvent; // event hub connect to full block is required to get payload
		if (payload) {
			chaincodeEvent.payload = payload.toString();
		}
		const {valid, interrupt} = validator(chaincodeEvent, blockNum, status);
		if (interrupt) {
			eventHub.unregisterChaincodeEvent(listener, true);
			disconnect(eventHub);
		}
		if (valid) {
			onSuccess(chaincodeEvent, blockNum, status);
		} else {
			const err = Error('Invalid chaincode event');
			Object.assign(err, {chaincodeEvent, blockNum, status, txId});
			onError(err);
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterChaincodeEvent(listener, true);
		disconnect(eventHub);
		onError(err);
	});
	return listener;
};
/**
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {OnBlockEventSuccess&Validator} [validator]
 * @param {OnBlockEventSuccess} onSuccess
 * @param {OnEvenHubError} onError
 * @returns {number} blockRegistrationNumber
 */
exports.blockEvent = (eventHub, validator, onSuccess, onError) => {
	const logger = Logger.new('blockEvent');
	if (!validator) {
		validator = (block) => {
			const {number, previous_hash, data_hash} = block.header;
			const {data} = block.data;
			logger.debug('blockEvent validator', {number, previous_hash, data_hash});
			return {valid: data.length === 1, interrupt: true}; //TODO inspect why data.length has meaning
		};
	}
	const block_registration_number = eventHub.registerBlockEvent((block) => {
		const {valid, interrupt} = validator(block);
		if (interrupt) {
			eventHub.unregisterBlockEvent(block_registration_number, true);
			disconnect(eventHub);
		}
		if (valid) {
			onSuccess(block);
		} else {
			const err = Error('Invalid block event');
			err.block = block;
			onError(err);
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterBlockEvent(block_registration_number, true);
		disconnect(eventHub);
		onError(err);
	});

	return block_registration_number;
};
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
		exports.blockEvent(eventHub, validator, onSucc, onErr);
	});
	return result.block;
};
exports.blockWaiter = blockWaiter;
exports.nextBlockWaiter = async (eventHub) => {
	const logger = Logger.new('nextBlockWaiter');
	const {peer, channel} = pretty(eventHub);
	const {pretty: {height}} = await Query.chain(peer, channel);
	logger.info(peer.toString(), `current block height ${height}`);// blockHeight indexing from 1
	await blockWaiter(eventHub, height);// blockNumber indexing from 0
};
const txEventCode = ['VALID', 'ENDORSEMENT_POLICY_FAILURE', 'MVCC_READ_CONFLICT'];
exports.txEventCode = txEventCode;
/**
 * @callback OnTxEventSuccess
 * @param tx
 * @param code
 * @param blockNum
 */
/**
 *
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {TransactionId} txId
 * @param {OnTxEventSuccess&Validator} [validator]
 * @param {OnTxEventSuccess} onSuccess
 * @param {OnEvenHubError} onError
 * @returns {string} transaction id string
 */
exports.txEvent = (eventHub, {txId}, validator, onSuccess, onError) => {
	const logger = Logger.new('txEvent');
	if (!validator) {
		validator = (tx, code, blockNum) => {
			logger.debug({tx, code, blockNum});
			return {valid: code === txEventCode[0], interrupt: true};
		};
	}
	const transactionID = txId.getTransactionID();
	eventHub.registerTxEvent(transactionID, (tx, code, blockNum) => {
		const {valid, interrupt} = validator(tx, code, blockNum);
		if (interrupt) {
			eventHub.unregisterTxEvent(transactionID, true);
			disconnect(eventHub);
		}
		if (valid) {
			onSuccess(tx, code, blockNum);
		} else {
			const err = Error('Invalid transaction event');
			Object.assign(err, {tx, code, blockNum});
			onError(err);
		}
	}, err => {
		logger.error(err);
		eventHub.unregisterTxEvent(transactionID, true);
		disconnect(eventHub);
		onError(err);
	});
	return transactionID;

};
