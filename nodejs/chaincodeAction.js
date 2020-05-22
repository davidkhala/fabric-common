const LifeCycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {getIdentityContext} = require('khala-fabric-admin/user');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');
const EventHub = require('khala-fabric-admin/eventHub');
const {emptyChannel} = require('khala-fabric-admin/channel');
const {waitForBlock} = require('./eventHub');

class ChaincodeAction {
	constructor(peers, user, channelName, logger) {
		if (!logger) {
			logger = require('khala-logger/log4js').consoleLogger('ChaincodeAction');
		}
		this.logger = logger;
		this.channel = channelName;
		this.identityContext = getIdentityContext(user);
		this.endorsers = peers.map(({endorser}) => endorser);
		this.eventers = peers.map(({eventer}) => eventer);
	}

	static _defaultVersion(sequence) {
		return sequence.toString();
	}

	async install(chaincodePackagePath) {
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, '', this.endorsers);

		const result = await lifeCycleProposal.installChaincode(chaincodePackagePath);
		this.logger.debug('installChaincode', getResponses(result));
		return result;
	}

	async approve({name, sequence, PackageID, version}, orderer) {
		version = version || ChaincodeAction._defaultVersion(sequence);
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);

		const result = await lifeCycleProposal.approveForMyOrg({
			name,
			version,
			sequence,
		}, PackageID);
		this.logger.debug('approve:proposal', getResponses(result));
		const commitResult = await lifeCycleProposal.commit([orderer.committer], 3000);
		this.logger.info('approve:commit', commitResult);
		const eventHub = new EventHub(emptyChannel(this.channel), this.eventers);
		await waitForBlock(eventHub, this.identityContext);
		eventHub.disconnect();
		return result;
	}

	async checkCommitReadiness({name, version, sequence}) {
		version = version || ChaincodeAction._defaultVersion(sequence);
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.checkCommitReadiness({name, version, sequence});
		this.logger.debug('checkCommitReadiness', getResponses(result));
		return result;

	}

	async commitChaincodeDefinition({name, version, sequence}, orderer) {
		version = version || ChaincodeAction._defaultVersion(sequence);
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.commitChaincodeDefinition({name, version, sequence});
		this.logger.debug('commitChaincodeDefinition', getResponses(result));
		const commitResult = await lifeCycleProposal.commit([orderer.committer], 3000);
		this.logger.debug('commitChaincodeDefinition:commit', commitResult);
		const eventHub = new EventHub(emptyChannel(this.channel), this.eventers);
		await waitForBlock(eventHub, this.identityContext);
		eventHub.disconnect();

		return result;
	}

	async queryChaincodeDefinition(name) {
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.queryChaincodeDefinition(name);
		if (name) {
			this.logger.debug('queryChaincodeDefinition', getResponses(result));
		} else {
			this.logger.debug('queryChaincodeDefinition', getResponses(result).map(({chaincode_definitions}) => chaincode_definitions));
		}

		return result;
	}
}

module.exports = ChaincodeAction;



