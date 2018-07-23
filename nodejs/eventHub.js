const logger = require('./logger').new('eventHub');
const fs = require('fs');
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
 * @returns {ChannelEventHub}
 */
exports.newEventHub = (channel, peer) => {
	return channel.newChannelEventHub(peer);
};
exports.blockEvent = (eventHub, validator = ({block}) => {
	return {valid: block.data.data.length === 1, interrupt: true};
}, onSuccess, onError = (err) => {
	throw err;
}) => {

	const block_registration_number = eventHub.registerBlockEvent((block) => {
		const {valid, interrupt} = validator({block});
		if (interrupt) {
			eventHub.unregisterBlockEvent(block_registration_number);
			eventHub.disconnect();
		}
		if (valid) {
			onSuccess({block, interrupt});
		} else {
			onError({block, interrupt});
		}
	}, (err) => {
		logger.error(err);
		eventHub.unregisterBlockEvent(block_registration_number);
		eventHub.disconnect();
		onError({err, interrupt: true});
	});

	return block_registration_number;
};
/**
 *
 * @param eventHub
 * @param txId
 * @param validator
 * @param onSuccess
 * @param onError
 * @returns {*|string}
 */
exports.txEvent = (eventHub, {txId}, validator = ({tx, code}) => {
	return {valid: code === 'VALID', interrupt: true};
}, onSuccess, onError = (err) => {
	throw err;
}) => {
	const transactionID = txId.getTransactionID();
	eventHub.connect();	//NOTE required in 1.2, only for txEvent
	eventHub.registerTxEvent(transactionID, (tx, code) => {
		const {valid, interrupt} = validator({tx, code});
		if (interrupt) {
			eventHub.unregisterTxEvent(transactionID);
			eventHub.disconnect();
		}
		if (valid) {
			onSuccess({tx, code, interrupt});
		} else {
			onError({tx, code, interrupt});
		}
	}, err => {
		eventHub.unregisterTxEvent(transactionID);
		eventHub.disconnect();
		onError({err, interrupt: true});
	});
	return transactionID;

};
