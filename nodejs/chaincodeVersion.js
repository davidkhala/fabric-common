const {newerVersion, nextVersion} = require('khala-nodeutils/version');
const {install} = require('./chaincode');
const Logger = require('./logger');
const {chaincodesInstalled, chaincodesInstantiated} = require('./query');
const {chaincodeClean} = require('./fabric-dockerode');
/**
 *
 * @param {Client.ChaincodeInfo[]} chaincodes
 * @param {string} chaincodeId
 * @param {versionComparator} comparator
 * @return {Client.ChaincodeInfo}
 */
exports.findLatest = (chaincodes, chaincodeId, comparator = newerVersion) => {
	const foundChaincodes = chaincodes.filter((element) => element.name === chaincodeId);
	const reducer = (lastChaincode, currentValue) => {
		if (!lastChaincode || comparator(currentValue.version, lastChaincode.version)) {
			return currentValue;
		} else {
			return lastChaincode;
		}
	};
	return foundChaincodes.reduce(reducer, undefined);
};


exports.incrementInstall = async (peer, {chaincodeId, chaincodePath, chaincodeType, metadataPath}, client, incrementLevel) => {
	const logger = Logger.new(`install version ${incrementLevel}`);
	const {chaincodes} = await chaincodesInstalled(peer, client);
	let chaincodeVersion;


	const lastChaincode = exports.findLatest(chaincodes, chaincodeId);
	if (!lastChaincode) {
		logger.warn(`No chaincode found with name ${chaincodeId}`);
		chaincodeVersion = nextVersion();
	} else {
		chaincodePath = lastChaincode.path;
		chaincodeVersion = nextVersion(lastChaincode.version, incrementLevel);
	}

	const result = await install([peer], {
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
