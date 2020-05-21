const {newerVersion, nextVersion} = require('khala-nodeutils/version');
const {instantiateOrUpgrade} = require('./chaincodeHelper');
const Logger = require('khala-logger/log4js');
const {chaincodesInstalled, chaincodesInstantiated} = require('./query');
const {chaincodeClear} = require('./fabric-dockerode');
const {ChaincodeProposalCommand} = require('khala-fabric-formatter/constants');

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

// TODO migration
exports.incrementUpgrade = async (channel, peers, eventHubs, opts, orderer, proposalTimeOut, eventTimeOut) => {
	const {chaincodeId} = opts;

	const {pretty} = await chaincodesInstantiated(peers[0], channel);
	const chaincode = pretty.find(({name}) => name === chaincodeId);
	if (!chaincode) {
		// eslint-disable-next-line require-atomic-updates
		opts.chaincodeVersion = nextVersion();
		await instantiateOrUpgrade(ChaincodeProposalCommand.deploy, channel, peers, eventHubs, opts, orderer, proposalTimeOut, eventTimeOut);
	} else {
		const {version} = chaincode;
		// eslint-disable-next-line require-atomic-updates
		opts.chaincodeVersion = nextVersion(version);
		await instantiateOrUpgrade(ChaincodeProposalCommand.upgrade, channel, peers, eventHubs, opts, orderer, proposalTimeOut, eventTimeOut);
	}
};
/**
 * prune legacy chaincode container and its linked legacy chaincode image
 * @param peer query peer to fetch instantiate info
 * @param channel
 * @param chaincodeId
 */
exports.pruneChaincodeLegacy = async (peer, channel, chaincodeId) => {
	const {pretty} = await chaincodesInstantiated(peer, channel);
	const {version} = pretty.find(({name}) => name === chaincodeId);
	const filter = ({Names}) => Names.find(containerName => containerName.includes(chaincodeId) && !containerName.includes(`${chaincodeId}-${version}`));
	await chaincodeClear(filter);
};
