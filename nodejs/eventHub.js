const Logger = require('./logger');
const logger = Logger.new('eventHub');
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
	const eventHub = channel.newChannelEventHub(peer);
	if (inlineConnected) {
		eventHub.connect(true);
	}
	return eventHub;
};
const defaultOnError = (err) => {
	throw err;
};
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
 * @param eventHub connection is required to be established
 * @param validator
 * @param chaincodeId
 * @param eventName
 * @param onSuccess
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
		const {payload} = chaincodeEvent; //event hub connect to full block is required to get payload
		if (payload) {
			chaincodeEvent.payload = payload.toString();
		}
		const {valid, interrupt} = validator({chaincodeEvent, blockNum, status});
		if (interrupt) {
			eventHub.unregisterChaincodeEvent(listener, true);
			eventHub.disconnect();
		}
		if (valid) {
			onSuccess({chaincodeEvent, blockNum, status, interrupt});
		} else {
			onError({chaincodeEvent, blockNum, status, interrupt});
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterChaincodeEvent(listener, true);
		eventHub.disconnect();
		onError({err, interrupt: true});
	});
	return listener;
};
exports.blockEvent = (eventHub, validator, onSuccess, onError = defaultOnError) => {
	const logger = Logger.new('blockEvent');
	if (!validator) {
		validator = ({block}) => {
			return {valid: block.data.data.length === 1, interrupt: true};
		};
	}
	const block_registration_number = eventHub.registerBlockEvent((block) => {
		const {valid, interrupt} = validator({block});
		if (interrupt) {
			eventHub.unregisterBlockEvent(block_registration_number, true);
			eventHub.disconnect();
		}
		if (valid) {
			onSuccess({block, interrupt});
		} else {
			onError({block, interrupt});
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterBlockEvent(block_registration_number, true);
		eventHub.disconnect();
		onError({err, interrupt: true});
	});

	return block_registration_number;
};
/**
 *
 * @param eventHub connection is required to be established
 * @param txId
 * @param {function} validator
 * @param {function} onSuccess
 * @param {evenHubErrorCB} onError
 * @returns {string}
 */
exports.txEvent = (eventHub, {txId}, validator, onSuccess, onError = defaultOnError) => {
	const logger = Logger.new('txEvent');
	if (!validator) {
		validator = ({tx, code}) => {
			return {valid: code === 'VALID', interrupt: true};
		};
	}
	const transactionID = txId.getTransactionID();
	eventHub.registerTxEvent(transactionID, (tx, code) => {
		const {valid, interrupt} = validator({tx, code});
		if (interrupt) {
			eventHub.unregisterTxEvent(transactionID, true);
			eventHub.disconnect();
		}
		if (valid) {
			onSuccess({tx, code, interrupt});
		} else {
			onError({tx, code, interrupt});
		}
	}, err => {
		logger.error(err);
		eventHub.unregisterTxEvent(transactionID, true);
		eventHub.disconnect();
		onError({err, interrupt: true});
	});
	return transactionID;

};
