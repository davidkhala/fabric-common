const LifecycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {waitForTx} = require('./eventHub');
const {sleep} = require('khala-light-util');
const assert = require('assert');
const ChaincodeAction = require('./chaincodeAction');
const {emptyChannel} = require('khala-fabric-admin/channel');
const Policy = require('khala-fabric-formatter/policy');
const GatePolicy = require('khala-fabric-formatter/gatePolicy');
const {CommonResponseStatus: {SERVICE_UNAVAILABLE}} = require('khala-fabric-formatter/constants');

const {buildCollectionConfig} = require('khala-fabric-formatter/SideDB');

class ChaincodeLifecycleOperation extends ChaincodeAction {
	/**
	 *
	 * @param peers
	 * @param user
	 * @param channel
	 * @param logger
	 */
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

	/**
	 * Install phase does not require `init_required` flag
	 * @param chaincodePackagePath
	 * @param useDynamicTimeout
	 * @return {Promise<*>}
	 */
	async install(chaincodePackagePath, useDynamicTimeout) {
		const lifeCycleProposal = new LifecycleProposal(this.identityContext, emptyChannel(''), this.endorsers, this.logger);

		let requestTimeout;
		if (useDynamicTimeout) {
			requestTimeout = 30000 * this.endorsers.length;
		}
		return await lifeCycleProposal.installChaincode(chaincodePackagePath, requestTimeout);
	}

	setEndorsementPolicy(endorsementPolicy) {
		this.endorsementPolicy = endorsementPolicy;
	}

	setCollectionsConfig(collectionsConfig) {
		this.collectionsConfig = collectionsConfig;
	}

	setInitRequired(init_required) {
		this.init_required = init_required;
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
			signature_policy = Policy.buildSignaturePolicyEnvelope(json);
		} else if (gate) {
			signature_policy = GatePolicy.FromString(gate);
		}
		// TODO allow undefined/ null
		return {
			signature_policy,
			channel_config_policy_reference: reference
		};
	}

	assign(lifecycleProposal) {
		const {endorsementPolicy, collectionsConfig, init_required} = this;
		if (endorsementPolicy) {
			const applicationPolicy = ChaincodeLifecycleOperation.applicationPolicyBuilder(endorsementPolicy);
			lifecycleProposal.setValidationParameter(applicationPolicy); // if empty buffer is set. Apply default
		}
		if (collectionsConfig) {
			const collectionConfigPackage = Object.entries(collectionsConfig).map(([name, config]) => {
				const collectionEndorsementPolicy = config.endorsementPolicy;
				if (collectionEndorsementPolicy) {
					config.endorsement_policy = ChaincodeLifecycleOperation.applicationPolicyBuilder(collectionEndorsementPolicy);
				}
				return this.buildCollectionConfig(name, config);
			});
			lifecycleProposal.setCollectionConfigPackage(collectionConfigPackage);
		}
		lifecycleProposal.setInitRequired(init_required);

	}

	/**
	 *
	 * @param name
	 * @param sequence
	 * @param PackageID
	 * @param version
	 * @param orderer
	 * @param {number} [waitForConsensus] millisecond to sleep between retry and get raft leader elected
	 * @return {Promise<*>}
	 */
	async approve({name, sequence, PackageID, version}, orderer, waitForConsensus) {
		version = version || ChaincodeLifecycleOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers, this.logger);
		this.assign(lifecycleProposal);
		const result = await lifecycleProposal.approveForMyOrg({
			name,
			version,
			sequence,
		}, PackageID);
		const _commit = async () => {
			const commitResult = await lifecycleProposal.commit([orderer.committer]);

			this.logger.info('approve:commit', commitResult);
			const {status, info} = commitResult;
			if (status === SERVICE_UNAVAILABLE && info === 'no Raft leader') {
				if (waitForConsensus) {
					await sleep(waitForConsensus, this.logger);
					return await _commit();
				} else {
					const err = Error(info);
					Object.assign(err, {status});
					throw err;
				}
			}
			assert.strictEqual(status, 'SUCCESS');
			assert.strictEqual(info, '');
			return commitResult;
		};

		await _commit();


		const eventHub = this.newEventHub();
		try {
			await waitForTx(eventHub, this.identityContext);
		} finally {
			eventHub.disconnect();
		}
		return result;
	}

	async checkCommitReadiness({name, version, sequence}) {
		version = version || ChaincodeLifecycleOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers, this.logger);
		this.assign(lifecycleProposal);
		const result = await lifecycleProposal.checkCommitReadiness({name, version, sequence});
		return result.queryResults;
	}

	async commitChaincodeDefinition({name, version, sequence}, orderer) {
		version = version || ChaincodeLifecycleOperation._defaultVersion(sequence);
		const lifecycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers, this.logger);
		this.assign(lifecycleProposal);
		const result = await lifecycleProposal.commitChaincodeDefinition({name, version, sequence});
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
		const lifeCycleProposal = new LifecycleProposal(this.identityContext, this.channel, this.endorsers, this.logger);
		const result = await lifeCycleProposal.queryChaincodeDefinition(name);
		return result.queryResults;
	}
}

module.exports = ChaincodeLifecycleOperation;



