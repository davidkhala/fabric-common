const {newerVersion, nextVersion} = require('khala-nodeutils/version');
const {instantiateOrUpgrade} = require('./chaincodeHelper');
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
 * @param {Client.Peer[]} peers
 * @param {string} chaincodeId
 * @param {string} [chaincodePath] if undefined, will use `path` of latest installed chaincode (in result of [queryInstalledChaincodes]).
 * @param {ChaincodeType} [chaincodeType]
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
		if (!chaincodePath) {
			chaincodePath = lastChaincode.path;
		}
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
exports.incrementUpgrade = async (channel, peers, eventHubs, opts, orderer, proposalTimeOut, eventTimeOut) => {
	const {chaincodeId} = opts;

	const {pretty} = await chaincodesInstantiated(peers[0], channel);
	const chaincode = pretty.find(({name}) => name === chaincodeId);
	if (!chaincode) {
		opts.chaincodeVersion = nextVersion();
		await instantiateOrUpgrade('deploy', channel, peers, eventHubs, opts, orderer, proposalTimeOut, eventTimeOut);
	} else {
		const {version} = chaincode;
		opts.chaincodeVersion = nextVersion(version);
		await instantiateOrUpgrade('upgrade', channel, peers, eventHubs, opts, orderer, proposalTimeOut, eventTimeOut);
	}
};
exports.pruneChaincodeLegacy = async (peer, channel, chaincodeId) => {
	const {pretty} = await chaincodesInstantiated(peer, channel);
	const {version} = pretty.find(({name}) => name === chaincodeId);
	const filter = (containerName) => containerName.includes(chaincodeId) && !containerName.includes(`${chaincodeId}-${version}`);
	await chaincodeClean(false, filter);
};
