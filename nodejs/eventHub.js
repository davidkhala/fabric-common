const Logger = require('./logger');
const logger = Logger.new('eventHub');
const ChannelEventHub = require('fabric-client/lib/ChannelEventHub');
const Query = require('./query');
exports.unRegisterAllEvents = (eventHub) => {
	eventHub._chaincodeRegistrants = {};
	eventHub._blockOnEvents = {};

	eventHub._blockOnErrors = {};
	eventHub._transactionOnEvents = {};
	eventHub._transactionOnErrors = {};
};
/**
 * @param {Channel} channel
 * @param {Peer} peer
 * @param {boolean} inlineConnected
 * @returns {ChannelEventHub}
 */
exports.newEventHub = (channel, peer, inlineConnected) => {
	const eventHub = new ChannelEventHub(channel, peer);
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
	//TODO sdk prune with isStreamReady(this);
	if (eventHub.checkConnection(false) && eventHub.isconnected()) {
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
 * @callback evenHubErrorCB
 * @param {Error} err
 * @param {boolean} interrupt mostly is true
 */
/**
 * @callback CCEventSuccessCB
 * @param {ChaincodeEvent} chaincodeEvent
 * @param {number} blockNum int number
 * @param {string} status
 * @param {boolean} interrupt
 */
/**
 *
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {function} validator
 * @param {string} chaincodeId
 * @param {string} eventName
 * @param {CCEventSuccessCB} onSuccess
 * @param {evenHubErrorCB} onError
 * @returns {ChaincodeChannelEventHandle}
 */
exports.chaincodeEvent = (eventHub, validator, {chaincodeId, eventName}, onSuccess, onError) => {
	const logger = Logger.new('chaincodeEvent');
	if (!validator) {
		validator = (data) => {
			logger.debug('default validator', data);
			return {valid: true, interrupt: true};
		};
	}
	const listener = eventHub.registerChaincodeEvent(chaincodeId, eventName, (chaincodeEvent, blockNum, txId, status) => {
		blockNum = parseInt(blockNum);
		const {payload} = chaincodeEvent; // event hub connect to full block is required to get payload
		if (payload) {
			chaincodeEvent.payload = payload.toString();
		}
		const {valid, interrupt} = validator({chaincodeEvent, blockNum, status});
		if (interrupt) {
			eventHub.unregisterChaincodeEvent(listener, true);
			disconnect(eventHub);
		}
		if (valid) {
			onSuccess({chaincodeEvent, blockNum, status, interrupt});
		} else {
			onError({chaincodeEvent, blockNum, status, interrupt});
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterChaincodeEvent(listener, true);
		disconnect(eventHub);
		onError({err, interrupt: true});
	});
	return listener;
};
/**
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {function} validator
 * @param onSuccess
 * @param {evenHubErrorCB} onError
 * @returns {number}
 */
exports.blockEvent = (eventHub, validator, onSuccess, onError) => {
	const logger = Logger.new('blockEvent');
	if (!validator) {
		validator = ({block}) => {
			const {number, previous_hash, data_hash} = block.header;
			const {data} = block.data;
			logger.debug('blockEvent validator', {number, previous_hash, data_hash});
			return {valid: data.length === 1, interrupt: true};
		};
	}
	const block_registration_number = eventHub.registerBlockEvent((block) => {
		const {valid, interrupt} = validator({block});
		if (interrupt) {
			eventHub.unregisterBlockEvent(block_registration_number, true);
			disconnect(eventHub);
		}
		if (valid) {
			onSuccess({block, interrupt});
		} else {
			onError({block, interrupt});
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterBlockEvent(block_registration_number, true);
		disconnect(eventHub);
		onError({err, interrupt: true});
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
 *
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {TransactionId} txId
 * @param {function} validator
 * @param {function} onSuccess
 * @param {evenHubErrorCB} onError
 * @returns {string} transaction id string
 */
exports.txEvent = (eventHub, {txId}, validator, onSuccess, onError) => {
	const logger = Logger.new('txEvent');
	if (!validator) {
		validator = ({tx, code, blockNum}) => {
			return {valid: code === txEventCode[0], interrupt: true};
		};
	}
	const transactionID = txId.getTransactionID();
	eventHub.registerTxEvent(transactionID, (tx, code, blockNum) => {
		const {valid, interrupt} = validator({tx, code, blockNum});
		if (interrupt) {
			eventHub.unregisterTxEvent(transactionID, true);
			disconnect(eventHub);
		}
		if (valid) {
			onSuccess({tx, code, blockNum, interrupt});
		} else {
			onError({tx, code, blockNum, interrupt});
		}
	}, err => {
		logger.error(err);
		eventHub.unregisterTxEvent(transactionID, true);
		disconnect(eventHub);
		onError({err, interrupt: true});
	});
	return transactionID;

};
