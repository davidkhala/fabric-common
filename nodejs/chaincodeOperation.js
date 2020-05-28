const LifecycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');
const {waitForTx} = require('./eventHub');
const ChaincodeAction = require('./chaincodeAction');
const {emptyChannel} = require('khala-fabric-admin/channel');


class ChaincodeOperation extends ChaincodeAction {
	constructor(peers, user, channel, logger) {
		super(peers, user, channel);
		if (!logger) {
			logger = require('khala-logger/log4js').consoleLogger('Chaincode Operation');
		}
		this.logger = logger;
	}

	static _defaultVersion(sequence) {
		return sequence.toString();
	}

	async install(chaincodePackagePath) {
		const lifeCycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(''), this.endorsers);

		const result = await lifeCycleProposal.installChaincode(chaincodePackagePath);
		this.logger.debug('installChaincode', getResponses(result));
		return result;
	}

	static _endorsementPolicyAssign(lifecycleProposal, endorsementPolicy) {
		if (!endorsementPolicy) {
			return;
		}
		const {json, gate} = endorsementPolicy;
		let signature_policy = null;
		if (json) {
			const Policy = require('./policy');
			const policy = new Policy(LifecycleProposal.getFabprotos());
			signature_policy = policy.buildSignaturePolicyEnvelope(json);
		} else if (gate) {
			const GatePolicy = require('khala-fabric-admin/gatePolicy');
			const policy = new GatePolicy(LifecycleProposal.getFabprotos());
			signature_policy = policy.FromString(gate);
		}
		const validation_parameter = LifecycleProposal.buildValidationParameter({signature_policy});
		// TODO what will happen if we give empty buffer to ValidationParameter
		lifecycleProposal.setValidationParameter(validation_parameter);
	}

	async approve({name, sequence, PackageID, version}, orderer, endorsementPolicy) {
		version = version || ChaincodeOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		ChaincodeOperation._endorsementPolicyAssign(lifecycleProposal, endorsementPolicy);
		const result = await lifecycleProposal.approveForMyOrg({
			name,
			version,
			sequence,
		}, PackageID);
		this.logger.debug('approve:proposal', getResponses(result));
		const commitResult = await lifecycleProposal.commit([orderer.committer]);
		this.logger.info('approve:commit', commitResult);
		const eventHub = this.newEventHub();
		try {
			await waitForTx(eventHub, this.identityContext);
		} finally {
			eventHub.disconnect();
		}
		return result;
	}

	async checkCommitReadiness({name, version, sequence}, endorsementPolicy) {
		version = version || ChaincodeOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		ChaincodeOperation._endorsementPolicyAssign(lifecycleProposal, endorsementPolicy);
		const result = await lifecycleProposal.checkCommitReadiness({name, version, sequence});
		this.logger.debug('checkCommitReadiness', getResponses(result));
		return result;

	}

	async commitChaincodeDefinition({name, version, sequence}, orderer, endorsementPolicy) {
		version = version || ChaincodeOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		ChaincodeOperation._endorsementPolicyAssign(lifecycleProposal, endorsementPolicy);
		const result = await lifecycleProposal.commitChaincodeDefinition({name, version, sequence});
		this.logger.debug('commitChaincodeDefinition', getResponses(result));
		const commitResult = await lifecycleProposal.commit([orderer.committer]);
		this.logger.debug('commitChaincodeDefinition:commit', commitResult);
		const eventHub = this.newEventHub();
		try {
			await waitForTx(eventHub, this.identityContext);
		} finally {
			eventHub.disconnect();
		}

		return result;
	}

	async queryChaincodeDefinition(name) {
		const lifeCycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.queryChaincodeDefinition(name);
		if (name) {
			this.logger.debug('queryChaincodeDefinition', getResponses(result));
		} else {
			this.logger.debug('queryChaincodeDefinition', getResponses(result).map(({chaincode_definitions}) => chaincode_definitions));
		}

		return result;
	}
}

module.exports = ChaincodeOperation;



