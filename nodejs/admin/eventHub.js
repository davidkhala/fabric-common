// TODO WIP
const EventService = require('fabric-common/lib/EventService');
const {BlockEventFilterType: {FULL_BLOCK}, TxEventFilterType: {ALL}} = require('khala-fabric-formatter/eventHub.js');

class EventHub {
	/**
	 * This works as unsignedRegistration. Later we sign the registration by build
	 * @constructor
	 * @param {Client.Channel} channel
	 * @param {Eventer[]} targets //TODO test on multiple eventhub;
	 * @param {EventService} [eventService] wrapped existing channelEventHub object
	 */
	constructor(channel, targets, eventService, options = {}) {
		if (!eventService) {
			eventService = new EventService('-', channel);
			eventService.setTargets(targets);
		}
		this.eventService = eventService;
		this.eventOptions = options;
	}

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param {BlockNumberFilterType|number} [startBlock]
	 * @param {BlockNumberFilterType|number} [endBlock]
	 */
	build(identityContext, {startBlock, endBlock} = {}) {
		const {eventService} = this;
		eventService.build(identityContext, {
			startBlock, endBlock, blockType: FULL_BLOCK
		});
		eventService.sign(identityContext);
	}

	async connect() {
		const {eventService} = this;
		await eventService.send(this.eventOptions);
	}

	disconnect() {
		this.eventService.close();
	}

	isConnected() {
		return this.eventService.isStarted();
	}

	_throwIfNotConnected() {
		if (!this.isConnected()) {
			throw Error('eventHub connection is required to be established');
		}
	}

	/**
	 * @param {EventListener} listener
	 */
	unregisterEvent(listener) {
		const notThrow = true;
		this.eventService.unregisterEventListener(listener, notThrow);
	}

	/**
	 * @callback EventCallback
	 * @param {Error} error
	 * @param {EventInfo} event
	 */

	/**
	 *
	 * @param {string} chaincodeId
	 * @param eventName
	 * @param {EventCallback} callback
	 * @param {EventRegistrationOptions} options
	 * @return {EventListener}
	 */
	chaincodeEvent(chaincodeId, eventName, callback, options) {
		const {eventService} = this;
		if (!options) {
			options = {unregister: false, startBlock: undefined, endBlock: undefined};
		}


		return eventService.registerChaincodeListener(chaincodeId, eventName, callback, options);
	}


	/**
	 *
	 * @param {EventCallback} callback
	 * @param {EventRegistrationOptions} [options]
	 * @return {EventListener}
	 */
	blockEvent(callback, options) {
		const {eventService} = this;
		if (!options) {
			options = {unregister: false, startBlock: undefined, endBlock: undefined};
		}

		return eventService.registerBlockListener(callback, options);
	}

	/**
	 *
	 * @param {string|TxEventFilterType} transactionID
	 * @param {EventCallback} callback
	 * @param {EventRegistrationOptions} options
	 * @return {EventListener}
	 */
	txEvent(transactionID, callback, options) {
		const {eventService} = this;
		if (!transactionID) {
			transactionID = ALL;
		}
		return eventService.registerTransactionListener(transactionID, callback, options);
	}
}


module.exports = EventHub;
