const Logger = require('./logger');
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
 * return internal properties
 * @param eventHub
 * @return {*}
 */
const propertiesOf = (eventHub) => {
	return {
		client: eventHub._clientContext,
		peer: eventHub._peer,
		channel: eventHub._channel
	};
};
exports.propertiesOf = propertiesOf;
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
/**
 * @param {ChannelEventHub} eventHub connection is required to be established
 * @param {function} validator
 * @param onSuccess
 * @param {evenHubErrorCB} onError
 * @returns {number}
 */
exports.blockEvent = (eventHub, validator, onSuccess, onError = defaultOnError) => {
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
const blockWaiter = async (eventHub, minHeight) => {
	const logger = Logger.new('blockWaiter');
	const {block} = await new Promise((resolve, reject) => {
		const onSucc = ({block, interrupt}) => {
			if (interrupt) {
				resolve({block});
			}
		};
		const onErr = (e) => reject(e);
		let validator;
		if (Number.isInteger(minHeight)) {
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
	return block;
};
exports.blockWaiter = blockWaiter;
exports.nextBlockWaiter = async (eventHub) => {
	const {peer, channel} = propertiesOf(eventHub);
	const {pretty: {height}} = await Query.chain(peer, channel);
	await blockWaiter(eventHub, height+1);//TODO anchor peer will not create new block?

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
exports.txEvent = (eventHub, {txId}, validator, onSuccess, onError = defaultOnError) => {
	const logger = Logger.new('txEvent');
	if (!validator) {
		validator = ({tx, code}) => {
			return {valid: code === txEventCode[0], interrupt: true};
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
