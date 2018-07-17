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
 *
 * @param {Client} client
 * @param {Number|string} eventHubPort
 * @param {string} cert optional, file path of pem
 * @param {string} pem certificate content
 * @param {string} peerHostName used as property 'ssl-target-name-override'
 * @param {string} host
 * @returns {EventHub}
 */
exports.new = (client, {eventHubPort, cert, pem, peerHostName, host = 'localhost'}) => {

	const eventHub = client.newEventHub();// NOTE newEventHub binds to clientContext
	if (pem) {
		eventHub.setPeerAddr(`grpcs://${host}:${eventHubPort}`, {
			pem,
			'ssl-target-name-override': peerHostName
		});
	} else if (cert) {
		eventHub.setPeerAddr(`grpcs://${host}:${eventHubPort}`, {
			pem: fs.readFileSync(cert).toString(),
			'ssl-target-name-override': peerHostName
		});
	}
	else {
		//non tls
		eventHub.setPeerAddr(`grpc://${host}:${eventHubPort}`);
	}
	// eventHub._force_reconnect = false; //see Bug design in registration and eventHub
	//FIXME: bug design in fabric, if onError callback is set in registerBlockEvent, the register action will reconnect EventHub automatically
	return eventHub;
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
	// eventHub.connect();//FIXME bug design in fabric. JSDOC  If the connection fails to get established, the application will be notified via the error callbacks from the registerXXXEvent() methods.
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
