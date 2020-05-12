// TODO WIP
const EventService = require('fabric-common/lib/EventService');
const {BlockEventFilterType: {FULL_BLOCK}, TxEventFilterType: {ALL}} = require('khala-fabric-formatter/eventHub.js');

class EventHub {
	/**
	 * This works as unsignedRegistration. Later we sign the registration by build
	 * @constructor
	 * @param {Client.Channel} channel
	 * @param {Peer[]|Orderer[]} targets //TODO test on multiple eventhub ; Could we use orderer as eventer
	 * @param {EventService} [eventService] wrapped existing channelEventHub object
	 */
	constructor(channel, targets, eventService) {
		if (!eventService) {
			eventService = new EventService('-', channel);
			eventService.setTargets(targets.map(target => target.eventer));
		}
		this.eventService = eventService;
	}

	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param {BlockNumberFilterType} startBlock
	 * @param {BlockNumberFilterType} endBlock
	 */
	build(identityContext, {startBlock, endBlock}) {
		const {eventService} = this;
		eventService.build(identityContext, {
			startBlock, endBlock, blockType: FULL_BLOCK
		});
		eventService.sign(identityContext);
	}

	async connect({requestTimeout} = {}) {
		const {eventService} = this;
		await eventService.send({requestTimeout});

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
	 * @param {EventInfo} event TODO inner data structure: Event or EventInfo
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
		this._throwIfNotConnected();
		if (!options) {
			options = {unregister: false, startBlock: undefined, endBlock: undefined};
		}


		return eventService.registerChaincodeListener(chaincodeId, eventName, callback, options);
	}


	/**
	 *
	 * @param {EventCallback} callback
	 * @param {EventRegistrationOptions} options
	 * @return {EventListener}
	 */
	blockEvent(callback, options) {
		const {eventService} = this;
		this._throwIfNotConnected();
		if (!options) {
			options = {unregister: false, startBlock: undefined, endBlock: undefined};
		}

		return eventService.registerBlockListener(callback, options);
	}

	static _assertEventHubDisconnectError(err, onAssertFailure) {
		// TODO align new message
		const asserted = err.message === 'ChannelEventHub has been shutdown';
		console.assert(asserted, 'expect "ChannelEventHub has been shutdown"');
		if (!asserted) {
			onAssertFailure(err);
		}
	}

	/**
	 * @callback TxEventCallback
	 * @param {Error} error
	 * @param {string} transactionID
	 * @param {string} status
	 * @param {long} blockNumber TODO need a parser
	 */

	/**
	 *
	 * @param {string|TxEventFilterType} transactionID
	 * @param {TxEventCallback} callback
	 * @param {EventRegistrationOptions} options
	 * @return {EventListener}
	 */
	txEvent(transactionID, callback, options) {
		const {eventService} = this;
		this._throwIfNotConnected();
		if (!transactionID) {
			transactionID = ALL;
		}
		return eventService.registerTransactionListener(transactionID, callback, options);
	}
}


module.exports = EventHub;
