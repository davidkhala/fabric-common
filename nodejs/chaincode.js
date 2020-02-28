const Logger = require('./logger');
const Channel = require('fabric-client/lib/Channel');
const Orderer = require('fabric-client/lib/Orderer');
const {unsignedTransaction, sendSignedTransaction} = require('./offline/chaincode');
const {sign, fromClient} = require('./user');
/**
 * @enum {string}
 */
const ChaincodeType = {
	golang: 'golang',
	node: 'node',
	java: 'java'
};
exports.ChaincodeType = ChaincodeType;
exports.proposalStringify = (proposalResponse) => {
	if (!(proposalResponse instanceof Error)) {
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
/**
 *
 * @param jsObject
 * @return {Client.TransientMap}
 */
const transientMapTransform = (jsObject) => {
	if (!jsObject) {
		return jsObject;
	}
	const result = {};
	for (const [key, value] of Object.entries(jsObject)) {
		result[key] = Buffer.from(value);
	}
	return result;
};
exports.transientMapTransform = transientMapTransform;
/**
 * @typedef {Object} ProposalResult
 * @property {number} errCounter
 * @property {number} swallowCounter
 * @property {Client.TransactionRequest} nextRequest
 */

/**
 * @callback ProposalValidator
 * @param {Object} response
 * @return {{isValid:boolean, isSwallowed:boolean}}
 */

/**
 * @param {string} actionString
 * @param {ProposalValidator} validator
 * @param {boolean} [verbose]
 * @param {boolean} [log]
 * @return {function(*[]): ProposalResult}
 */
const chaincodeProposalAdapter = (actionString, validator, verbose, log) => {
	const logger = Logger.new(`chaincodeProposalAdapter:${actionString}`, true);
	const _validator = validator ? validator : ({response}) => {
		return {isValid: response && response.status === 200, isSwallowed: false};
	};
	const stringify = (proposalResponse) => {
		if (proposalResponse instanceof Error) {
			proposalResponse.payload = proposalResponse.payload.toString();
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
	return ([proposalResponses, proposal]) => {

		let errCounter = 0; // NOTE logic: reject only when all bad
		let swallowCounter = 0;

		for (const i in proposalResponses) {
			const proposalResponse = proposalResponses[i];
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
				proposalResponses, proposal
			}
		};

	};
};
exports.chaincodeProposalAdapter = chaincodeProposalAdapter;

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
 * @param {Client.Peer[]} peers
 * @param {string} chaincodeId allowedCharsChaincodeName = "[A-Za-z0-9_-]+"
 * @param {string} chaincodePath
 * @param {string} chaincodeVersion allowedCharsVersion  = "[A-Za-z0-9_.-]+"
 * @param {ChaincodeType} [chaincodeType]
 * @param {string} [metadataPath] the absolute path to the directory structure containing the JSON index files. e.g<br>
 * <$metadataPath>/statedb/couchdb/indexes/<files *.json>
 * @param [chaincodePackage]
 * @param {Client} client
 * @returns {Promise<ProposalResult>}
 */
exports.install = async (peers,
	{chaincodeId, chaincodePath, chaincodeVersion, chaincodeType = ChaincodeType.golang, metadataPath, chaincodePackage},
	client) => {
	const logger = Logger.new('chaincode:install', true);
	if (peers.length > 1) {
		logger.debug({peersLength: peers.length});
	}
	let request = {
		targets: peers
	};
	if (chaincodePackage) {
		const fs = require('fs');
		logger.debug('use ChaincodePackageInstall fashion', chaincodePackage);
		request.chaincodePackage = fs.readFileSync(chaincodePackage);
	} else {
		logger.debug('use ChaincodePathInstall fashion', {
			chaincodeId,
			chaincodePath,
			chaincodeVersion,
			chaincodeType,
			metadataPath
		});
		exports.nameMatcher(chaincodeId, true);
		exports.versionMatcher(chaincodeVersion, true);
		request = Object.assign(request, {
			chaincodePath,
			chaincodeId,
			chaincodeVersion,
			chaincodeType,
			metadataPath
		});
	}


	//targets?: Peer[] | string[];
	// 		channelNames?: string[] | string;
	// 		txId?: TransactionId;
	// 		chaincodePackage: Buffer;


	const [responses, proposal] = await client.installChaincode(request);
	const ccHandler = chaincodeProposalAdapter('install', (proposalResponse) => {
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
	}, undefined, undefined);
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
 *
 * @param proposalResponses
 * @param proposal
 * @return {Client.TransactionRequest}
 */
const transactionProposalResponseErrorHandler = (proposalResponses, proposal) => {
	const logger = Logger.new('chaincode:transactionProposal', true);
	const ccHandler = chaincodeProposalAdapter('transactionProposal', undefined, true);
	const {nextRequest, errCounter} = ccHandler([proposalResponses, proposal]);

	if (errCounter > 0) {
		logger.error('proposalResponses', proposalResponses);
		const err = Error('isProposalResponse');
		err.proposalResponses = proposalResponses;
		err.code = 'transactionProposal';
		throw err;
	}
	return nextRequest;
};
exports.transactionProposalResponseErrorHandler = transactionProposalResponseErrorHandler;
/**
 * NOTE transaction proposal cannot be performed on peer without chaincode installed
 * Error: cannot retrieve package for chaincode adminChaincode/v0,
 *        error open /var/hyperledger/production/chaincodes/adminChaincode.v0: no such file or directory
 *
 * This is also used as query
 * @param {Client} client
 * @param {Client.Peer[]} targets
 * @param {string} channelName
 * @param {string} chaincodeId
 * @param {string} fcn
 * @param {string[]} args
 * @param {TransientMap} [transientMap]
 * @param {number} proposalTimeout
 * @return {Promise<Client.TransactionRequest>}
 */
exports.transactionProposal = async (client, targets, channelName, {
	chaincodeId, fcn, args, transientMap
}, proposalTimeout = 30000) => {
	const txId = client.newTransactionID();
	const request = {
		chaincodeId,
		fcn,
		args,
		txId,
		targets,
		transientMap: transientMapTransform(transientMap)
	};

	const [responses, proposal] = await Channel.sendTransactionProposal(request, channelName, client, proposalTimeout);
	const nextRequest = transactionProposalResponseErrorHandler(responses, proposal);
	nextRequest.txId = txId;
	return nextRequest;
};

/**
 * result parser is not required here, because the payload in proposal response is in form of garbled characters.
 * @param {string} command 'deploy' or 'upgrade'
 * @param {Channel} channel
 * @param {Client.Peer[]} peers default: all peers in channel
 * @param {ChaincodeProposalOpts} opts
 * @param {number} [proposalTimeOut]
 * @return {Promise<Client.TransactionRequest>}
 */
exports.chaincodeProposal = async (
	command, channel, peers, opts, proposalTimeOut
) => {
	const logger = Logger.new(`${command}-chaincode:proposal`, true);
	const {chaincodeId, chaincodeVersion, args, fcn, endorsementPolicy, collectionConfig, chaincodeType, transientMap} = opts;

	const client = channel._clientContext;
	logger.debug({channelName: channel.getName()}, opts);

	exports.versionMatcher(chaincodeVersion, true);

	const txId = client.newTransactionID();

	/**
	 * @type {ChaincodeInstantiateUpgradeRequest|*} // TODO still version mismatch
	 */
	const request = {
		targets: peers, // optional: if not set, targets will be channel.getPeers
		chaincodeType,
		chaincodeId,
		chaincodeVersion,
		txId,
		'collections-config': collectionConfig,
		transientMap: transientMapTransform(transientMap),
		fcn,
		args,
		'endorsement-policy': endorsementPolicy
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
		throw err;
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
 * @param {Client.TransactionRequest} nextRequest
 * @param {Orderer} orderer
 * @param {number} [timeout]
 * @return {Promise<Client.BroadcastResponse>}
 */
exports.invokeCommit = async (client, nextRequest, orderer, timeout) => {
	if (!(orderer instanceof Orderer)) {
		throw Error(`orderer should be instance of Orderer, but got ${typeof orderer}`);
	}
	const {proposalResponses, proposal} = nextRequest;
	const unsignedTx = unsignedTransaction(proposalResponses, proposal);
	const user = fromClient(client);
	const proposal_bytes = unsignedTx.toBuffer();
	const signature = sign(user, proposal_bytes);
	return await sendSignedTransaction({signature, proposal_bytes}, orderer, timeout);
};

