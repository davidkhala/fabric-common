const logger = require('./logger').new('eventHub');
const fs = require('fs');
exports.unRegisterAllEvents = (eventHub) => {
	eventHub._chaincodeRegistrants = {};
	eventHub._blockOnEvents = {};

	eventHub._blockOnErrors = {};
	eventHub._transactionOnEvents = {};
	eventHub._transactionOnErrors = {};
};

exports.new = (client, {eventHubPort, cert, pem, peerHostName, host}) => {

	const Host = host ? host : 'localhost';
	const eventHub = client.newEventHub();// NOTE newEventHub binds to clientContext
	if (pem) {
		eventHub.setPeerAddr(`grpcs://${Host}:${eventHubPort}`, {
			pem,
			'ssl-target-name-override': peerHostName
		});
	} else if (cert) {
		eventHub.setPeerAddr(`grpcs://${Host}:${eventHubPort}`, {
			pem: fs.readFileSync(cert).toString(),
			'ssl-target-name-override': peerHostName
		});
	}
	else {
		//non tls
		//FIXME node-sdk jsdoc update
		eventHub.setPeerAddr(`grpc://${Host}:${eventHubPort}`);
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
exports.txEventPromise = (eventHub, {txId, eventWaitTime, timeOutErr}, validator = ({tx, code}) => {

	return {valid: code === 'VALID', interrupt: true};
}) => {
	const transactionID = txId.getTransactionID();
	return new Promise((resolve, reject) => {
		// eventHub.connect();//FIXME bug design in fabric. JSDOC  If the connection fails to get established, the application will be notified via the error callbacks from the registerXXXEvent() methods.
		const timerID = setTimeout(() => {
			eventHub.unregisterTxEvent(transactionID);
			eventHub.disconnect();
			reject(timeOutErr ? timeOutErr : 'txEventTimeout');
		}, eventWaitTime);

		eventHub.registerTxEvent(transactionID, (tx, code) => {
			const {valid, interrupt} = validator({tx, code});
			if (interrupt) {
				clearTimeout(timerID);
				eventHub.unregisterTxEvent(transactionID);
				eventHub.disconnect();
			}
			if (valid) {
				resolve({tx, code});
			} else {
				reject({tx, code});
			}
		}, err => {
			eventHub.unregisterTxEvent(transactionID);
			eventHub.disconnect();
			reject(err);
		});

	});
};
