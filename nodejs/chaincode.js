const logUtil = require('./logger');
const logger = logUtil.new('chaincode', true);
const Channel = require('fabric-client/lib/Channel');
const Orderer = require('fabric-client/lib/Orderer');
const ChannelUtil = require('./channel');
const {txEvent, txEventCode} = require('./eventHub');

exports.reducer = ({txEventResponses, proposalResponses}) => ({
	txs: txEventResponses.map(entry => entry.tx),
	responses: proposalResponses.map((entry) => entry.response.payload.toString())
});
exports.transientMap = (jsObject) => {
	if (!jsObject) {
		return jsObject;
	}
	const result = {};
	for (const [key, value] of Object.entries(jsObject)) {
		result[key] = Buffer.from(value);
	}
	return result;
};
/**
 * @typedef {Object} ProposalResult
 * @property {number} errCounter
 * @property {number} swallowCounter
 * @property {TransactionRequest} nextRequest
 */

/**
 * @callback ProposalValidator
 * @param {Object} response
 * @return {{isValid:boolean, isSwallowed:boolean}}
 */

/**
 * @param {string} actionString
 * @param {ProposalValidator} validator
 * @param {boolean} verbose
 * @param {boolean} log
 * @return {function(*[]): ProposalResult}
 */
exports.chaincodeProposalAdapter = (actionString, validator, verbose, log) => {
	const _validator = validator ? validator : ({response}) => {
		return {isValid: response && response.status === 200, isSwallowed: false};
	};
	const stringify = (proposalResponse, verbose) => {
		if (proposalResponse instanceof Error) {
			return proposalResponse;
		}
		const copy = Object.assign({}, proposalResponse);
		const {response} = copy;
		if (!response) return copy;
		const {payload: r_payload} = response;
		const {endorsement} = copy;
		if (endorsement) {
			copy.endorsement = Object.assign({}, proposalResponse.endorsement);
			copy.endorsement.endorser = copy.endorsement.endorser.toString();
		}
		if (verbose) copy.response.payload = r_payload.toString();
		if (!verbose) delete copy.payload;
		return copy;
	};
	return ([responses, proposal]) => {

		let errCounter = 0; // NOTE logic: reject only when all bad
		let swallowCounter = 0;

		for (const i in responses) {
			const proposalResponse = responses[i];
			const {isValid, isSwallowed} = _validator(proposalResponse);

			if (isValid) {
				if (log) logger.info(`${actionString} is good for [${i}]`, stringify(proposalResponse, verbose));
				if (isSwallowed) {
					swallowCounter++;
				}
			} else {
				logger.error(`${actionString} is bad for [${i}]`, stringify(proposalResponse, verbose));
				errCounter++;
			}
		}

		return {
			errCounter,
			swallowCounter,
			nextRequest: {
				proposalResponses: responses, proposal,
			},
		};

	};
};


exports.nameMatcher = (chaincodeName, toThrow) => {
	const namePattern = /^[A-Za-z0-9_-]+$/;
	const result = chaincodeName.match(namePattern);
	if (!result && toThrow) {
		throw Error(`invalid chaincode name:${chaincodeName}; should match regx: ${namePattern}`);
	}
	return result;
};
exports.versionMatcher = (ccVersionName, toThrow) => {
	const namePattern = /^[A-Za-z0-9_.-]+$/;
	const result = ccVersionName.match(namePattern);
	if (!result && toThrow) {
		throw Error(`invalid chaincode version:${ccVersionName}; should match regx: ${namePattern}`);
	}
	return result;
};
/**
 * install chaincode does not require channel existence
 * set golang path is required when chaincodeType is 'golang'
 * @param {Peer[]} peers
 * @param {string} chaincodeId allowedCharsChaincodeName = "[A-Za-z0-9_-]+"
 * @param chaincodePath
 * @param {string} chaincodeVersion allowedCharsVersion  = "[A-Za-z0-9_.-]+"
 * @param {string} chaincodeType Optional. Type of chaincode. One of 'golang', 'car', 'node' or 'java'.
 * @param {string} metadataPath the absolute path to the directory structure containing the JSON index files. e.g<br>
 * <$metadataPath>/statedb/couchdb/indexes/<files *.json>
 * @param {Client} client
 * @returns {Promise<ProposalResult>}
 */
exports.install = async (peers, {chaincodeId, chaincodePath, chaincodeVersion, chaincodeType = 'golang', metadataPath}, client) => {
	const logger = logUtil.new('chaincode:install', true);
	logger.debug({peers_length: peers.length, chaincodeId, chaincodePath, chaincodeVersion});

	exports.nameMatcher(chaincodeId, true);
	exports.versionMatcher(chaincodeVersion, true);
	const request = {
		targets: peers,
		chaincodePath,
		chaincodeId,
		chaincodeVersion,
		chaincodeType,
		metadataPath
	};

	const [responses, proposal] = await client.installChaincode(request);
	const ccHandler = exports.chaincodeProposalAdapter('install', (proposalResponse) => {
		const {response} = proposalResponse;
		if (response) {
			const {status, message} = response;
			if (status === 200) {
				return {
					isValid: true,
					isSwallowed: false
				};
			}
		} else {
			if (proposalResponse.toString().includes('exists')) {
				logger.warn('swallow when exsitence');
				return {isValid: true, isSwallowed: true};
			}
		}
		return {isValid: false, isSwallowed: false};
	});
	const result = ccHandler([responses, proposal]);
	const {errCounter, nextRequest: {proposalResponses}} = result;
	if (errCounter > 0) {
		throw Error(JSON.stringify(proposalResponses));
	} else {
		return result;
	}
};


/**
 * @typedef {Object} instantiateOrUpgradeOpts
 * @property {string} chaincodeId
 * @property {string} chaincodeVersion
 * @property {string[]} args
 * @property {string} fcn
 * @property {Object} endorsementPolicy
 * @property {Object} collectionConfig
 * @property {string} chaincodeType Type of chaincode. One of 'golang', 'car', 'java' or 'node'.
 */
/**
 * TODO provide atomic step
 * @param {string} command 'deploy' or 'upgrade'
 * @param channel
 * @param {Peer[]} peers default: all peers in channel
 * @param {EventHub[]} eventHubs
 * @param {instantiateOrUpgradeOpts} opts
 * @param {number} eventWaitTime default: 30000
 * @param {number} proposalTimeOut
 * @returns {Promise}
 */
exports.instantiateOrUpgrade = async (
	command, channel, peers, eventHubs,
	opts,
	eventWaitTime, proposalTimeOut
) => {
	const logger = logUtil.new(`${command}-chaincode`, true);
	const {chaincodeId, chaincodeVersion, args, fcn, endorsementPolicy, collectionConfig, chaincodeType} = opts;
	if (command !== 'deploy' && command !== 'upgrade') {
		throw Error(`invalid command: ${command}`);
	}

	const client = channel._clientContext;
	if (!eventWaitTime) eventWaitTime = 30000;
	logger.debug({channelName: channel.getName()}, opts);

	exports.versionMatcher(chaincodeVersion, true);

	const txId = client.newTransactionID();

	const request = {
		chaincodeId,
		chaincodeVersion,
		args,
		fcn,
		txId,
		targets: peers,// optional: if not set, targets will be channel.getPeers
		'endorsement-policy': endorsementPolicy,
		'collections-config': collectionConfig,
		chaincodeType,
	};
	const existSymptom = 'exists';


	const [responses, proposal] = await channel._sendChaincodeProposal(request, command, proposalTimeOut);

	logger.info('got proposalReponse: ', responses.length);
	const ccHandler = exports.chaincodeProposalAdapter(command, proposalResponse => {
		const {response} = proposalResponse;
		if (response && response.status === 200) return {isValid: true, isSwallowed: false};
		if (proposalResponse instanceof Error && proposalResponse.toString().includes(existSymptom)) {
			logger.warn('swallow when existence');
			return {isValid: true, isSwallowed: true};
		}
		return {isValid: false, isSwallowed: false};
	});
	const {errCounter, swallowCounter, nextRequest} = ccHandler([responses, proposal]);
	const {proposalResponses} = nextRequest;
	if (errCounter > 0) {
		for (const eventHub of eventHubs) {
			eventHub.disconnect();
		}
		throw {proposalResponses};
	}
	if (swallowCounter === proposalResponses.length) {
		logger.warn('[final] swallow when existence');
		for (const eventHub of eventHubs) {
			eventHub.disconnect();
		}
		return {proposalResponses};
	}

	const promises = [];
	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, {txId}, eventWaitTime));
	}

	const response = await channel.sendTransaction(nextRequest);
	logger.info('channel.sendTransaction', response);
	return Promise.all(promises);
	//	NOTE result parser is not required here, because the payload in proposalresponse is in form of garbled characters.
};


const txTimerPromise = (eventHub, {txId}, eventWaitTime) => {
	const validator = ({tx, code}) => {
		logger.debug('newTxEvent', {tx, code});
		return {valid: code === txEventCode.valid, interrupt: true};
	};
	return new Promise((resolve, reject) => {
		const onSuccess = ({tx, code, interrupt}) => {
			clearTimeout(timerID);
			resolve({tx, code});
		};
		const onErr = (err) => {
			clearTimeout(timerID);
			reject(err);
		};
		const transactionID = txEvent(eventHub, {txId}, validator, onSuccess, onErr);
		const timerID = setTimeout(() => {
			eventHub.unregisterTxEvent(transactionID);
			eventHub.disconnect();
			reject({err: 'txTimeout'});
		}, eventWaitTime);
	});
};

/**
 * NOTE Invoke action cannot be performed on peer without chaincode installed
 * Error: cannot retrieve package for chaincode adminChaincode/v0,
 *        error open /var/hyperledger/production/chaincodes/adminChaincode.v0: no such file or directory
 * @param channel
 * @param peers
 * @param eventHubs
 * @param chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {Object} transientMap key<string> -> value<string>
 * @param {Orderer} orderer target orderer, default to pick one in channel
 * @param {Number} eventWaitTime optional, default to use 30000 ms
 * @return {Promise<{txEventResponses: any[], proposalResponses}>}
 */
exports.invoke = async (channel, peers, eventHubs, {chaincodeId, fcn, args, transientMap}, orderer, eventWaitTime) => {
	const logger = logUtil.new('chaincode:invoke', true);
	logger.debug({channel: channel.getName(), peersSize: peers.length, chaincodeId, fcn, args});
	if (!eventWaitTime) eventWaitTime = 30000;
	const client = channel._clientContext;

	const nextRequest = await exports.invokeProposal(client, peers, channel.getName(), {
		chaincodeId,
		fcn,
		args,
		transientMap: exports.transientMap(transientMap)
	});

	const {txId, proposalResponses} = nextRequest;
	const promises = [];

	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, {txId}, eventWaitTime));
	}

	await exports.invokeCommit(client, nextRequest, orderer);

	const txEventResponses = await Promise.all(promises);
	return {txEventResponses, proposalResponses};
};
/**
 * @param {Client} client
 * @param {Peer[]} targets
 * @param {string} channelId
 * @param {string} chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {Object} transientMap jsObject of key<string> --> value<Buffer>
 * @param {number} proposalTimeout
 * @return {Promise<TransactionRequest>}
 */
exports.invokeProposal = async (client, targets, channelId, {chaincodeId, fcn, args, transientMap}, proposalTimeout) => {
	const logger = logUtil.new('chaincode:invokeProposal', true);
	const txId = client.newTransactionID();
	const request = {
		chaincodeId,
		fcn,
		args,
		txId,
		targets,
		transientMap
	};

	const [responses, proposal] = await Channel.sendTransactionProposal(request, channelId, client, proposalTimeout);
	const ccHandler = exports.chaincodeProposalAdapter('invoke');
	const {nextRequest, errCounter} = ccHandler([responses, proposal]);
	const {proposalResponses} = nextRequest;

	if (errCounter > 0) {
		logger.error({proposalResponses});
		throw {proposalResponses};
	}
	nextRequest.txId = txId;
	return nextRequest;
};
/**
 *
 * @param {Client} client
 * @param {TransactionRequest} nextRequest
 * @param {Orderer} orderer
 * @return {Promise<Client.BroadcastResponse>}
 */
exports.invokeCommit = async (client, nextRequest, orderer) => {
	if (!(orderer instanceof Orderer)) {
		throw Error(`orderer should be instance of Orderer, but got ${typeof orderer}`);
	}
	nextRequest.orderer = orderer;
	const dummyChannel = ChannelUtil.newDummy(client);
	return dummyChannel.sendTransaction(nextRequest);
};

exports.query = async (channel, peers, {chaincodeId, fcn, args}) => {
	const logger = logUtil.new('chaincode:query', true);
	logger.debug({channelName: channel.getName(), peersSize: peers.length, chaincodeId, fcn, args});
	const client = channel._clientContext;
	const txId = client.newTransactionID();

	const request = {
		chaincodeId,
		fcn,
		args,
		txId,
		targets: peers //optional: use channel.getPeers() as default
	};
	const results = await channel.queryByChaincode(request);
	return results.map(e => e.toString());
};