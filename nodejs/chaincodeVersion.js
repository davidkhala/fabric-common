const {newerVersion, nextVersion} = require('khala-nodeutils/version');
const {install} = require('./chaincode');
const Logger = require('./logger');
const {chaincodesInstalled, chaincodesInstantiated} = require('./query');
const {chaincodeClean} = require('./fabric-dockerode');
const {isArrayEven} = require('khala-nodeutils/helper');

/**
 *
 * @param {Client.ChaincodeInfo[]} chaincodes
 * @param {string} chaincodeId
 * @param {versionComparator} comparator
 * @return {Client.ChaincodeInfo}
 */
const findLatest = (chaincodes, chaincodeId, comparator = newerVersion) => {
	const foundChaincodes = chaincodes.filter(({name}) => name === chaincodeId);
	const reducer = (lastChaincode, currentValue) => {
		if (!lastChaincode || comparator(currentValue.version, lastChaincode.version)) {
			return currentValue;
		} else {
			return lastChaincode;
		}
	};
	return foundChaincodes.reduce(reducer, undefined);
};

exports.findLatest = findLatest;
/**
 *
 * @param {Peer[]} peers
 * @param {string} chaincodeId
 * @param {string} chaincodePath
 * @param {string} [chaincodeType]
 * @param {string} [metadataPath]
 * @param {Client} client
 * @param {string} incrementLevel incrementLevel major|minor|patch
 * @returns {Promise<ProposalResult>}
 */
exports.incrementInstall = async (peers, {chaincodeId, chaincodePath, chaincodeType, metadataPath}, client, incrementLevel) => {
	const logger = Logger.new(`install version ${incrementLevel}`, true);
	const versions = [];
	for (const peer of peers) {
		const {pretty} = await chaincodesInstalled(peer, client);
		const lastChaincode = findLatest(pretty, chaincodeId);
		versions.push(lastChaincode);
	}
	if (!isArrayEven(versions)) {
		logger.error('chaincode versions not even', versions);
		throw Error('chaincode versions not even');
	}
	let chaincodeVersion;
	const lastChaincode = versions[0];
	if (!lastChaincode) {
		logger.warn(`chaincode ${chaincodeId} not found`);
		chaincodeVersion = nextVersion();
	} else {
		chaincodePath = lastChaincode.path;
		chaincodeVersion = nextVersion(lastChaincode.version, incrementLevel);
	}

	const result = await install(peers, {
		chaincodeId,
		chaincodePath,
		chaincodeVersion,
		chaincodeType,
		metadataPath
	}, client);
	result.chaincodeVersion = chaincodeVersion;
	return result;
};

exports.pruneChaincodeLegacy = async (peer, channel, chaincode) => {
	let {pretty} = await chaincodesInstantiated(peer, channel);
	console.debug(pretty);
	if (chaincode) {
		pretty = pretty.filter(({name}) => name === chaincode);
	}
	for (const {name, version} of pretty) {
		const filter = (containerName) => containerName.includes(name) && !containerName.includes(`${name}-${version}`);
		await chaincodeClean(false, filter);
	}

};
