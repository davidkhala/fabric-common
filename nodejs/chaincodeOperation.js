const LifecycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {waitForTx} = require('./eventHub');
const ChaincodeAction = require('./chaincodeAction');
const {emptyChannel} = require('khala-fabric-admin/channel');
const Policy = require('./policy');
const GatePolicy = require('khala-fabric-admin/gatePolicy');

const {buildCollectionConfig} = require('khala-fabric-admin/SideDB');

class ChaincodeOperation extends ChaincodeAction {
	/**
	 *
	 * @param peers
	 * @param user
	 * @param channel
	 * @param {EndorseResultHandler} endorseResultInterceptor
	 * @param logger
	 */
	constructor(peers, user, channel, endorseResultInterceptor, logger) {
		super(peers, user, channel);
		if (!logger) {
			logger = require('khala-logger/log4js').consoleLogger('Chaincode Operation');
		}
		this.logger = logger;
		this.endorseResultInterceptor = endorseResultInterceptor;
	}

	static _defaultVersion(sequence) {
		return sequence.toString();
	}

	async install(chaincodePackagePath, useDynamicTimeout) {
		const lifeCycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(''), this.endorsers);

		let requestTimeout;
		if (useDynamicTimeout) {
			requestTimeout = 30000 * this.endorsers.length;
		}
		const result = await lifeCycleProposal.installChaincode(chaincodePackagePath, requestTimeout);
		this.endorseResultInterceptor(result);
		return result;
	}

	setEndorsementPolicy(endorsementPolicy) {
		this.endorsementPolicy = endorsementPolicy;
	}

	setCollectionsConfig(collectionsConfig) {
		this.collectionsConfig = collectionsConfig;
	}

	buildCollectionConfig(name, config) {
		const {identities, required_peer_count, maximum_peer_count, block_to_live, member_only_write, member_only_read, endorsement_policy} = config;
		if (required_peer_count < identities.length - 1) {
			this.logger.warn(`[recommend] collectionConfig ${name}:requiredPeerCount > ${identities.length - 2} is suggested in production`);
		}
		return buildCollectionConfig({
			name,
			member_only_write,
			member_only_read,
			required_peer_count,
			member_orgs: identities,
			block_to_live,
			maximum_peer_count,
			endorsement_policy,
		});
	}

	static applicationPolicyBuilder(_endorsementPolicy) {
		const {json, gate, reference} = _endorsementPolicy;
		let signature_policy = null;
		if (json) {
			const policy = new Policy(LifecycleProposal.getFabprotos());
			signature_policy = policy.buildSignaturePolicyEnvelope(json);
		} else if (gate) {
			const policy = new GatePolicy(LifecycleProposal.getFabprotos());
			signature_policy = policy.FromString(gate);
		}
		return LifecycleProposal.buildApplicationPolicy({
			signature_policy,
			channel_config_policy_reference: reference
		});
	}

	assign(lifecycleProposal) {
		const {endorsementPolicy, collectionsConfig} = this;
		if (endorsementPolicy) {
			const applicationPolicy = ChaincodeOperation.applicationPolicyBuilder(endorsementPolicy);
			lifecycleProposal.setValidationParameter(applicationPolicy); // if empty buffer is set. Apply default
		}
		if (collectionsConfig) {
			const collectionConfigPackage = Object.entries(collectionsConfig).map(([name, config]) => {
				const collectionEndorsementPolicy = config.endorsementPolicy;
				if (collectionEndorsementPolicy) {
					config.endorsement_policy = ChaincodeOperation.applicationPolicyBuilder(collectionEndorsementPolicy);
				}
				return this.buildCollectionConfig(name, config);
			});
			lifecycleProposal.setCollectionConfigPackage(collectionConfigPackage);
		}

	}

	async approve({name, sequence, PackageID, version}, orderer) {
		version = version || ChaincodeOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		this.assign(lifecycleProposal);
		const result = await lifecycleProposal.approveForMyOrg({
			name,
			version,
			sequence,
		}, PackageID);
		this.endorseResultInterceptor(result);
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

	async checkCommitReadiness({name, version, sequence}) {
		version = version || ChaincodeOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		this.assign(lifecycleProposal);
		const result = await lifecycleProposal.checkCommitReadiness({name, version, sequence});
		return result.queryResults;

	}

	async commitChaincodeDefinition({name, version, sequence}, orderer) {
		version = version || ChaincodeOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers);
		this.assign(lifecycleProposal);
		const result = await lifecycleProposal.commitChaincodeDefinition({name, version, sequence});
		this.endorseResultInterceptor(result);
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
		return result.queryResults;
	}
}

module.exports = ChaincodeOperation;



