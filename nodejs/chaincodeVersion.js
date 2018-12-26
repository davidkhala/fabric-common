const {newerVersion, nextVersion} = require('khala-nodeutils/version');
const {install} = require('./chaincode');
const Logger = require('./logger');
const Query = require('./query');
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


exports.incrementInstall = async (peer, {chaincodeId, chaincodePath, chaincodeType, metadataPath}, client, incrementLevel = 'patch') => {
	const logger = Logger.new(`install version ${incrementLevel}`);
	const {chaincodes} = await Query.chaincodesInstalled(peer, client);
	let chaincodeVersion;


	const lastChaincode = exports.findLatest(chaincodes, chaincodeId);
	if (!lastChaincode) {
		logger.warn(`No chaincode found with name ${chaincodeId}`);
		chaincodeVersion = nextVersion();
	} else {
		chaincodePath = lastChaincode.path;
		chaincodeVersion = nextVersion(lastChaincode.version, incrementLevel);
	}

	const result = await install([peer], {chaincodeId, chaincodePath, chaincodeVersion, chaincodeType, metadataPath}, client);
	result.chaincodeVersion = chaincodeVersion;
	return result;
};