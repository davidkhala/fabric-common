const Logger = require('./logger');
const Channel = require('fabric-client/lib/Channel');
const Orderer = require('fabric-client/lib/Orderer');
const ChannelUtil = require('./channel');

exports.chaincodeTypes = ['golang', 'car', 'node', 'java'];
exports.proposalStringify = (proposalResponse) => {
	if (proposalResponse instanceof Error === false) {
		proposalResponse.response.payload = proposalResponse.response.payload.toString();
	}
	return proposalResponse;
};
exports.proposalFlatten = proposalResponse => {
	if (proposalResponse instanceof Error) {
		return proposalResponse.message;
	} else {
		return proposalResponse.response.payload;
	}
};
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
	const logger = Logger.new(`chaincodeProposalAdapter:${actionString}`, true);
	const _validator = validator ? validator : ({response}) => {
		return {isValid: response && response.status === 200, isSwallowed: false};
	};
	const stringify = (proposalResponse) => {
		if (proposalResponse instanceof Error) {
			return proposalResponse;
		}
		const {response} = proposalResponse;
		if (!response) {
			return proposalResponse;
		}
		const {endorsement} = proposalResponse;
		const copy = Object.assign({}, proposalResponse);
		if (endorsement) {
			copy.endorsement = Object.assign({}, proposalResponse.endorsement);
			copy.endorsement.endorser = copy.endorsement.endorser.toString();
		}
		if (verbose) {
			exports.proposalStringify(copy);
		}
		if (!verbose) {
			delete copy.payload;
		}
		return copy;
	};
	return ([responses, proposal]) => {

		let errCounter = 0; // NOTE logic: reject only when all bad
		let swallowCounter = 0;

		for (const i in responses) {
			const proposalResponse = responses[i];
			const {isValid, isSwallowed} = _validator(proposalResponse);

			if (isValid) {
				if (log) {
					logger.info(`good for [${i}]`, stringify(proposalResponse, verbose));
				}
				if (isSwallowed) {
					swallowCounter++;
				}
			} else {
				logger.error(`bad for [${i}]`, stringify(proposalResponse, verbose));
				errCounter++;
			}
		}

		return {
			errCounter,
			swallowCounter,
			nextRequest: {
				proposalResponses: responses, proposal
			}
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
	const logger = Logger.new('chaincode:install', true);
	logger.debug({
		peers_length: peers.length,
		chaincodeId,
		chaincodePath,
		chaincodeVersion,
		chaincodeType,
		metadataPath
	});

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
					isSwallowed: false,
					message
				};
			}
		} else {
			if (proposalResponse.toString().includes('exists')) {
				logger.warn('swallow when exsitence', proposalResponse);
				return {isValid: true, isSwallowed: true};
			}
		}
		return {isValid: false, isSwallowed: false};
	});
	const result = ccHandler([responses, proposal]);
	const {errCounter, nextRequest: {proposalResponses}} = result;
	if (errCounter > 0) {
		const err = Error('isProposalResponse');
		err.code = 'chaincodeProposal';
		err.proposalResponses = proposalResponses;
		throw err;
	} else {
		return result;
	}
};


/**
 * NOTE transaction proposal cannot be performed on peer without chaincode installed
 * Error: cannot retrieve package for chaincode adminChaincode/v0,
 *        error open /var/hyperledger/production/chaincodes/adminChaincode.v0: no such file or directory
 *
 * This is also used as query
 * @param {Client} client
 * @param {Peer[]} targets
 * @param {string} channelName
 * @param {string} chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {Object} transientMap jsObject of key<string> --> value<string>
 * @param {number} proposalTimeout
 * @return {Promise<TransactionRequest>}
 */
exports.transactionProposal = async (client, targets, channelName, {
	chaincodeId, fcn, args, transientMap
}, proposalTimeout = 30000) => {
	const logger = Logger.new('chaincode:transactionProposal', true);
	const txId = client.newTransactionID();
	const request = {
		chaincodeId,
		fcn,
		args,
		txId,
		targets,
		transientMap: exports.transientMap(transientMap)
	};

	const [responses, proposal] = await Channel.sendTransactionProposal(request, channelName, client, proposalTimeout);
	const ccHandler = exports.chaincodeProposalAdapter('invoke', undefined, true);
	const {nextRequest, errCounter} = ccHandler([responses, proposal]);
	const {proposalResponses} = nextRequest;

	if (errCounter > 0) {
		logger.error({proposalResponses});
		const err = Error('isProposalResponse');
		err.proposalResponses = proposalResponses;
		err.code = 'transactionProposal';
		throw err;
	}
	nextRequest.txId = txId;
	return nextRequest;
};

/**
 * result parser is not required here, because the payload in proposal response is in form of garbled characters.
 * @param {string} command 'deploy' or 'upgrade'
 * @param {Channel} channel
 * @param {Peer[]} peers default: all peers in channel
 * @param {chaincodeProposalOpts} opts
 * @param {number} proposalTimeOut
 * @return {Promise<TransactionRequest}>}
 */
exports.chaincodeProposal = async (
	command, channel, peers, opts, proposalTimeOut
) => {
	const logger = Logger.new(`${command}-chaincode:proposal`, true);
	const {chaincodeId, chaincodeVersion, args, fcn, endorsementPolicy, collectionConfig, chaincodeType} = opts;

	const client = channel._clientContext;
	logger.debug({channelName: channel.getName()}, opts);

	exports.versionMatcher(chaincodeVersion, true);

	const txId = client.newTransactionID();

	const request = {
		chaincodeId,
		chaincodeVersion,
		args,
		fcn,
		txId,
		targets: peers, // optional: if not set, targets will be channel.getPeers
		'endorsement-policy': endorsementPolicy,
		'collections-config': collectionConfig,
		chaincodeType
	};
	const existSymptom = 'exists';// TODO stronger limitation


	// TODO sdk enhance
	const [responses, proposal] = await channel._sendChaincodeProposal(request, command, proposalTimeOut);

	const ccHandler = exports.chaincodeProposalAdapter(command, proposalResponse => {
		const {response} = proposalResponse;
		if (response && response.status === 200) {
			return {isValid: true, isSwallowed: false};
		}
		if (proposalResponse instanceof Error && proposalResponse.message.includes(existSymptom)) {
			logger.warn('swallow when existence', proposalResponse.message);
			return {isValid: true, isSwallowed: true};
		}
		return {isValid: false, isSwallowed: false};
	});
	const {errCounter, swallowCounter, nextRequest} = ccHandler([responses, proposal]);
	const {proposalResponses} = nextRequest;
	if (errCounter > 0) {
		const err = Error('isProposalResponse:');
		err.code = 'chaincodeProposal';
		err.proposalResponses = proposalResponses;
		throw Error(err);
	}
	if (swallowCounter === proposalResponses.length) {
		logger.warn('[final] swallow when existence');
		return nextRequest;
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
	return dummyChannel.sendTransaction(nextRequest);// TODO fix sdk
};
