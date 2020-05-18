const Logger = require('khala-logger/log4js');

const LifeCycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {getIdentityContext} = require('khala-fabric-admin/user');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');
exports.install = async (peers, chaincodePackagePath, user) => {
	const logger = Logger.consoleLogger('chaincode:install');

	const identityContext = getIdentityContext(user);

	const lifeCycleProposal = new LifeCycleProposal(identityContext, '', peers);

	const result = await lifeCycleProposal.installChaincode(chaincodePackagePath);
	const responses = getResponses(result)
	logger.debug(responses);
};


// const {ChaincodeType, nameMatcher, versionMatcher} = require('khala-fabric-formatter/chaincode');
// const {transientMapTransform} = require('khala-fabric-formatter/txProposal');
//
// /**
//  * @param {string} command 'deploy' or 'upgrade'
//  * @param {Client.Channel} channel
//  * @param {Client.Peer[]} peers default: all peers in channel
//  * @param {ChaincodeProposalOpts} opts
//  * @param {number} [proposalTimeOut]
//  * @return {Promise<Client.TransactionRequest>}
//  */
// exports.chaincodeProposal = async (
// 	command, channel, peers, opts, proposalTimeOut
// ) => {
// 	const logger = Logger.consoleLogger(`${command}-chaincode:proposal`);
// 	const {chaincodeId, chaincodeVersion, args, fcn, endorsementPolicy, collectionConfig, chaincodeType, transientMap} = opts;
//
// 	const client = channel._clientContext;
// 	logger.debug({channelName: channel.getName()}, opts);
//
// 	versionMatcher(chaincodeVersion, true);
//
// 	const txId = client.newTransactionID();
//
// 	/**
// 	 * @type {ChaincodeInstantiateUpgradeRequest|*}
// 	 */
// 	const request = {
// 		targets: peers, // optional: if not set, targets will be channel.getPeers
// 		chaincodeType,
// 		chaincodeId,
// 		chaincodeVersion,
// 		txId,
// 		'collections-config': collectionConfig,
// 		transientMap: transientMapTransform(transientMap),
// 		fcn,
// 		args,
// 		'endorsement-policy': endorsementPolicy
// 	};
//
// 	const [proposalResponses, proposal] = await channel._sendChaincodeProposal(request, command, proposalTimeOut);
//
// 	return {proposalResponses, proposal, txId};
// };
//
//
