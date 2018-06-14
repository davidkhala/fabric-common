const logger = require('./logger').new('chaincode');
const golangUtil = require('./golang');
const logUtil = require('./logger');
const Query = require('./query');
const commonHelper = require('./helper.js');
const {txEvent, blockEvent} = require('./eventHub');
const Policy = require('fabric-client/lib/Policy');
exports.nextVersion = (chaincodeVersion) => {
	const version = parseInt(chaincodeVersion.substr(1));
	return `v${version + 1}`;
};
exports.reducer = ({txEventResponses, proposalResponses}) => ({
	txs: txEventResponses.map(entry => entry.tx),
	responses: proposalResponses.map((entry) => entry.response.payload.toString())
});


exports.resultWrapper = (result, {proposalResponses}) => ({
	txEventResponses: result,
	proposalResponses
});

exports.chaincodeProposalAdapter = (actionString, validator) => {
	const _validator = validator ? validator : ({response}) => {
		return {isValid: response && response.status === 200, isSwallowed: false};
	};
	return ([responses, proposal, header]) => {

		let errCounter = 0; // NOTE logic: reject only when all bad
		let swallowCounter = 0;
		for (const i in responses) {
			const proposalResponse = responses[i];
			const {isValid, isSwallowed} = _validator(proposalResponse);
			if (isValid) {
				logger.info(`${actionString} was good for [${i}]`, proposalResponse);
				if (isSwallowed) {
					swallowCounter++;
				}
			} else {
				logger.error(`${actionString} was bad for [${i}]`, proposalResponse);
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

/**
 * install chaincode does not require channel existence
 * @param {Peer[]} peers
 * @param {string} chaincodeId allowedCharsChaincodeName = "[A-Za-z0-9_-]+"
 * @param chaincodePath
 * @param {string} chaincodeVersion allowedCharsVersion       = "[A-Za-z0-9_.-]+"
 * @param {Client} client
 * @returns {Promise<*>}
 */
exports.install = async (peers, {chaincodeId, chaincodePath, chaincodeVersion}, client) => {
	const logger = logUtil.new('install-chaincode');
	logger.debug({peers_length: peers.length, chaincodeId, chaincodePath, chaincodeVersion});

	const request = {
		targets: peers,
		chaincodePath,
		chaincodeId,
		chaincodeVersion
	};
	await golangUtil.setGOPATH();
	const [responses, proposal, header] = await client.installChaincode(request);
	const ccHandler = exports.chaincodeProposalAdapter('install', (proposalResponse) => {
		const {response} = proposalResponse;
		if (response && response.status === 200) return {
			isValid: true,
			isSwallowed: false
		};
		if (proposalResponse instanceof Error && proposalResponse.toString().includes('exists')) {
			logger.warn('swallow when exsitence');
			return {isValid: true, isSwallowed: true};
		}
		return {isValid: false, isSwallowed: false};
	});
	const result = ccHandler([responses, proposal, header]);
	const {errCounter, nextRequest: {proposalResponses}} = result;
	if (errCounter > 0) {
		throw proposalResponses;
	} else {
		return result;
	}
};

exports.updateInstall = async (peer, {chaincodeId}, client) => {
	const {chaincodes} = await Query.chaincodes.installed(peer, client);
	const foundChaincode = chaincodes.find((element) => element.name === chaincodeId);
	if (!foundChaincode) {
		throw `No chaincode found with name ${chaincodeId}`;
	}
	const {version, path: chaincodePath} = foundChaincode;

	// [ { name: 'adminChaincode',
	// 	version: 'v0',
	// 	path: 'github.com/admin',
	// 	input: '',
	// 	escc: '',
	// 	vscc: '' } ]

	const chaincodeVersion = exports.nextVersion(version);
	return exports.install([peer], {chaincodeId, chaincodePath, chaincodeVersion}, client);

};


/**
 *
 * @param channel
 * @param {Peer[]} peers default: all peers in channel
 * @param {EventHub[]} eventHubs
 * @param chaincodeId
 * @param chaincodeVersion
 * @param {string[]} args
 * @param {string} fcn default: 'init'
 * @param eventWaitTime default: 30000
 * @returns {Promise<any[]>}
 */
exports.instantiate = async (channel, peers, eventHubs, {chaincodeId, chaincodeVersion, args, fcn = 'init'}, eventWaitTime) => {
	const logger = logUtil.new('instantiate-chaincode');
	const client = channel._clientContext;
	if (!eventWaitTime) eventWaitTime = 30000;
	logger.debug({channelName: channel.getName(), chaincodeId, chaincodeVersion, args});

	//Error: Verifying MSPs not found in the channel object, make sure "intialize()" is called first.

	const txId = client.newTransactionID();

	const {Role, OrganizationUnit, Identity} = Policy.IDENTITY_TYPE; // TODO only option 'Role' has been implemented
	const roleType = 'member'; //member|admin

	const policyTypes = [
		'signed-by', (key) => key.match(/^\d+-of$/)
	];
	const request = {
		chaincodeId,
		chaincodeVersion,
		args,
		fcn,
		txId,
		targets: peers// optional: if not set, targets will be channel.getPeers
		// , 'endorsement-policy': {
		// 	identities: [
		// 		{
		// 			[Role]: {
		// 				name: roleType,
		// 				mspId: ''
		// 			}
		// 		}],
		// 	policy: {}
		// }
		// 		`chaincodeType` : optional -- Type of chaincode ['golang', 'car', 'java'] (default 'golang')
	};
	const existSymptom = '(status: 500, message: chaincode exists';

	const [responses, proposal, header] = await channel.sendInstantiateProposal(request);

	const ccHandler = exports.chaincodeProposalAdapter('instantiate', proposalResponse => {
		const {response} = proposalResponse;
		if (response && response.status === 200) return {isValid: true, isSwallowed: false};
		if (proposalResponse instanceof Error && proposalResponse.toString().includes(existSymptom)) {
			logger.warn('swallow when existence');
			return {isValid: true, isSwallowed: true};
		}
		return {isValid: false, isSwallowed: false};
	});
	const {errCounter, swallowCounter, nextRequest} = ccHandler([responses, proposal, header]);
	const {proposalResponses} = nextRequest;
	if (errCounter > 0) {
		throw {proposalResponses};
	}
	if (swallowCounter === proposalResponses.length) {
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
exports.upgradeToCurrent = async (channel, richPeer, {chaincodeId, args, fcn}, client = channel._clientContext) => {
	const {chaincodes} = await Query.chaincodes.installed(richPeer, client);
	const foundChaincode = chaincodes.find((element) => element.name === chaincodeId);
	if (!foundChaincode) {
		throw `No chaincode found with name ${chaincodeId}`;
	}
	const {version} = foundChaincode;

	// [ { name: 'adminChaincode',
	// 	version: 'v0',
	// 	path: 'github.com/admin',
	// 	input: '',
	// 	escc: '',
	// 	vscc: '' } ]

	const chaincodeVersion = exports.nextVersion(version);
	return exports.upgrade(channel, [richPeer], {chaincodeId, args, chaincodeVersion, fcn}, client);
};
exports.upgrade = async (channel, peers, eventHubs, {chaincodeId, chaincodeVersion, args, fcn}, eventWaitTime) => {
	const client = channel._clientContext;
	const logger = logUtil.new('upgrade-chaincode');
	if (!eventWaitTime) eventWaitTime = 30000;
	const txId = client.newTransactionID();
	const request = {
		chaincodeId,
		chaincodeVersion,
		args,
		txId,
		fcn
	};
	const existSymptom = '(status: 500, message: version already exists for chaincode ';

	const ccHandler = exports.chaincodeProposalAdapter('upgrade', proposalResponse => {
		const {response} = proposalResponse;
		if (response && response.status === 200) return {isValid: true, isSwallowed: false};
		if (proposalResponse instanceof Error && proposalResponse.toString().includes(existSymptom)) {
			logger.warn('swallow when existence');
			return {isValid: true, isSwallowed: true};
		}
		return {isValid: false, isSwallowed: false};
	});

	const [responses, proposal, header] = await channel.sendUpgradeProposal(request);
	const {errCounter, swallowCounter, nextRequest} = ccHandler([responses, proposal, header]);

	const {proposalResponses} = nextRequest;

	if (errCounter > 0) {
		throw  {proposalResponses};
	}
	if (swallowCounter === proposalResponses.length) {
		return {proposalResponses};
	}
	const promises = [];

	for (const eventHub of eventHubs) {
		promises.push(txTimerPromise(eventHub, {txId}, eventWaitTime));
	}

	await channel.sendTransaction(nextRequest);
	logger.info('channel.sendTransaction success');
	return Promise.all(promises);
	//	NOTE result parser is not required here, because the payload in proposalresponse is in form of garbled characters.
};

const txTimerPromise = (eventHub, {txId}, eventWaitTime) => {
	const validator = ({tx, code}) => {
		logger.debug('newTxEvent', {tx, code});
		return {valid: code === 'VALID', interrupt: true};
	};
	const txPromise = new Promise((resolve, reject) => {
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
	return txPromise;
};