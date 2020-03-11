const ChannelEventHub = require('fabric-client/lib/ChannelEventHub');

class EventHub {
	/**
	 * @param {Client.Channel} channel
	 * @param {Client.Peer} peer
	 * @param {ChannelEventHub} [channelEventHub] existing channelEventHub object if any
	 * @param [logger]
	 */
	constructor(channel, peer, channelEventHub, logger = console) {
		this.channelEventHub = channelEventHub || new ChannelEventHub(channel, peer);
		this.logger = logger;
	}

	async connect({startBlock, endBlock, signedEvent} = {}) {
		return new Promise((resolve, reject) => {
			const connectCallback = (err, eventHub) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			};
			/**
			 *
			 * @type {ConnectOptions}
			 */
			const options = {
				full_block: true,
				startBlock, endBlock,
				signedEvent
			};
			this.channelEventHub.connect(options, connectCallback);
		});

	}

	/**
	 * @param {CertificatePem} certificate
	 * @param {MspId} mspId
	 * @return {Buffer}
	 */
	unsignedRegistration(certificate, mspId) {
		/**
		 * @type {EventHubRegistrationRequest}
		 */
		const options = {
			certificate, mspId,
			txId: undefined, identity: undefined
		};
		return this.channelEventHub.generateUnsignedRegistration(options);
	}


	unRegisterAllEvents() {
		this.channelEventHub._chaincodeRegistrants = new Map();
		this.channelEventHub._blockOnEvents = {};

		this.channelEventHub._blockOnErrors = {};
		this.channelEventHub._transactionOnEvents = {};
		this.channelEventHub._transactionOnErrors = {};
	}

	/**
	 *
	 * Disconnects the ChannelEventHub from the peer event source.
	 * Will close all event listeners and send an Error object
	 * with the message "ChannelEventHub has been shutdown" to
	 * all listeners that provided an "onError" callback.
	 */
	disconnect() {
		const eventHub = this.channelEventHub;
		if (eventHub.checkConnection(false) && eventHub.isconnected() && !eventHub._disconnect_running) {
			this.logger.debug('eventHub disconnect', {
				peer: eventHub._peer.toString(),
				channel: eventHub._channel.getName()
			});
			eventHub.disconnect();
		}
	}

	isConnected() {
		const eventHub = this.channelEventHub;
		return eventHub.checkConnection(false) && eventHub.isconnected() && !eventHub._disconnect_running;
	}

	pretty() {
		return {
			isConnected: this.channelEventHub._connected,
			client: this.channelEventHub._clientContext,
			peer: this.channelEventHub._peer,
			channel: this.channelEventHub._channel
		};
	}

	_throwIfNotConnected() {
		if (!this.isConnected()) {
			throw Error('eventHub connection is required to be established');
		}
	}

	/**
	 * @param {ChaincodeChannelEventHandle} listener
	 */
	unregisterChaincodeEvent(listener) {
		this.channelEventHub.unregisterChaincodeEvent(listener, true);
	}

	/**
	 *
	 * @param {OnChaincodeEventSuccess&Validator} validator
	 * @param {string} chaincodeId
	 * @param {string|RegExp} eventName
	 * @param {OnChaincodeEventSuccess} onSuccess
	 * @param {OnEvenHubError} onError
	 * @returns {ChaincodeChannelEventHandle}
	 */
	chaincodeEvent(validator, {chaincodeId, eventName}, onSuccess, onError) {
		const eventHub = this.channelEventHub;
		this._throwIfNotConnected();

		if (!validator) {
			validator = (chaincodeEvent, blockNum, status) => {
				this.logger.debug('chaincodeEvent', {chaincodeEvent, blockNum, status});
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
				this.unregisterChaincodeEvent(listener);
				this.disconnect();
			}
			if (valid) {
				onSuccess(chaincodeEvent, blockNum, status);
			} else {
				const err = Error('Invalid chaincode event');
				Object.assign(err, {chaincodeEvent, blockNum, status, txId});
				onError(err);
			}
		}, (err) => {
			this.unregisterChaincodeEvent(listener);
			EventHub._assertEventHubDisconnectError(err, onError);
		});
		return listener;
	}

	/**
	 * @param {number} listener a blockRegistrationNumber as identifier
	 */
	unregisterBlockEvent(listener) {
		this.channelEventHub.unregisterBlockEvent(listener, true);
	}

	/**
	 * @param {OnBlockEventSuccess&Validator} [validator]
	 * @param {OnBlockEventSuccess} onSuccess
	 * @param {OnEvenHubError} onError
	 * @returns {number} blockRegistrationNumber
	 */
	blockEvent(validator, onSuccess, onError) {
		const eventHub = this.channelEventHub;
		this._throwIfNotConnected();
		if (!validator) {
			validator = (block) => {
				const {number, previous_hash, data_hash} = block.header;
				this.logger.debug('blockEvent', {number, previous_hash, data_hash});
				return {valid: true, interrupt: true};
			};
		}
		const block_registration_number = eventHub.registerBlockEvent((block) => {
			const {valid, interrupt} = validator(block);
			if (interrupt) {
				this.unregisterBlockEvent(block_registration_number);
				this.disconnect();
			}
			if (valid) {
				onSuccess(block);
			} else {
				const err = Error('Invalid block event');
				err.block = block;
				onError(err);
			}
		}, (err) => {
			this.unregisterBlockEvent(block_registration_number);
			EventHub._assertEventHubDisconnectError(err, onError);
		});

		return block_registration_number;
	}

	/**
	 * @param {string} listener a `txId`
	 */
	unregisterTxEvent(listener) {
		this.channelEventHub.unregisterTxEvent(listener, true);
	}

	static _assertEventHubDisconnectError(err, onAssertFailure) {
		const asserted = err.message === 'ChannelEventHub has been shutdown';
		console.assert(asserted, 'expect "ChannelEventHub has been shutdown"');
		if (!asserted) {
			onAssertFailure(err);
		}
	}

	/**
	 *
	 * @param {TransactionId} [txId]
	 * @param {string} [transactionID]
	 * @param {OnTxEventSuccess&Validator} [validator]
	 * @param {OnTxEventSuccess} onSuccess
	 * @param {OnEvenHubError} onError
	 * @returns {string} transaction id string
	 */
	txEvent({txId, transactionID}, validator, onSuccess, onError) {
		const eventHub = this.channelEventHub;
		this._throwIfNotConnected();
		if (!validator) {
			const {txEventCode} = require('khala-fabric-formatter/eventHub');
			validator = (tx, code, blockNum) => {
				this.logger.debug('txEvent', {tx, code, blockNum});
				return {valid: code === txEventCode[0], interrupt: true};
			};
		}
		if (!transactionID) {
			transactionID = txId.getTransactionID();
		}
		// some modification on transactionID may happen during `registerTxEvent`
		transactionID = eventHub.registerTxEvent(transactionID, (tx, code, blockNum) => {
			const {valid, interrupt} = validator(tx, code, blockNum);
			if (interrupt) {
				this.unregisterTxEvent(transactionID);
				this.disconnect();
			}
			if (valid) {
				onSuccess(tx, code, blockNum);
			} else {
				const err = Error('Invalid transaction event');
				Object.assign(err, {tx, code, blockNum});
				onError(err);
			}
		}, err => {
			this.unregisterTxEvent(transactionID);
			EventHub._assertEventHubDisconnectError(err, onError);
		});
		return transactionID;

	}
}

EventHub.txEventCode = ['VALID', 'ENDORSEMENT_POLICY_FAILURE', 'MVCC_READ_CONFLICT'];


/**
 * @typedef {boolean} ToInterrupt Expected listener status
 */
/**
 * @callback OnEvenHubError
 * @param {Error} err
 */
/**
 * @callback OnBlockEventSuccess
 * @param {Block} block
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
 * @callback OnTxEventSuccess
 * @param tx
 * @param code
 * @param blockNum
 */

module.exports = EventHub;
