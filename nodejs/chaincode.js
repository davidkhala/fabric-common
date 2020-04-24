const Logger = require('./logger');
const {ChaincodeType, nameMatcher, versionMatcher} = require('khala-fabric-formatter/chaincode');
const {transientMapTransform} = require('khala-fabric-formatter/txProposal');

/**
 * install chaincode does not require channel existence
 * set golang path is required when chaincodeType is 'golang'
 * @param {Client.Peer[]} peers
 * @param {string} [chaincodeId] allowedCharsChaincodeName = "[A-Za-z0-9_-]+"
 * @param {string} [chaincodePath]
 * @param {string} [chaincodeVersion] allowedCharsVersion  = "[A-Za-z0-9_.-]+"
 * @param {ChaincodeType} [chaincodeType]
 * @param {string} [metadataPath] the absolute path to the directory structure containing the JSON index files. e.g<br>
 * <$metadataPath>/statedb/couchdb/indexes/<files *.json>
 * @param [chaincodePackage]
 * @param {Client} client
 * @returns {Promise<Array<Client.ProposalResponse | Client.ProposalErrorResponse>>}
 */
exports.install = async (peers,
	{chaincodeId, chaincodePath, chaincodeVersion, chaincodeType = ChaincodeType.golang, metadataPath, chaincodePackage},
	client) => {
	const logger = Logger.new('chaincode:install', true);
	if (peers.length > 1) {
		logger.debug(peers.map(peer => peer.getName()));
	}
	const request = {
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
		nameMatcher(chaincodeId, true);
		versionMatcher(chaincodeVersion, true);
		Object.assign(request, {
			chaincodePath,
			chaincodeId,
			chaincodeVersion,
			chaincodeType,
			metadataPath
		});
	}

	const [proposalResponses, proposal] = await client.installChaincode(request);
	return proposalResponses;

};

/**
 * @param {string} command 'deploy' or 'upgrade'
 * @param {Client.Channel} channel
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

	versionMatcher(chaincodeVersion, true);

	const txId = client.newTransactionID();

	/**
	 * @type {ChaincodeInstantiateUpgradeRequest|*}
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

	const [proposalResponses, proposal] = await channel._sendChaincodeProposal(request, command, proposalTimeOut);

	return {proposalResponses, proposal, txId};
};


