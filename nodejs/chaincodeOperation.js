import LifecycleProposal from 'khala-fabric-admin/lifecycleProposal.js';
import EventHubQuery from './eventHub.js';
import {sleep} from '@davidkhala/light/index.js';
import ChaincodeAction from './chaincodeAction.js';
import {emptyChannel} from 'khala-fabric-admin/channel.js';
import Policy from 'khala-fabric-formatter/policy.js';
import GatePolicy from 'khala-fabric-formatter/gatePolicy.js';
import {CommonResponseStatus} from 'khala-fabric-formatter/constants.js';
import {buildCollectionConfig} from 'khala-fabric-formatter/SideDB.js';
import {CommitSuccess} from 'khala-fabric-admin/resultInterceptors.js';

const {SERVICE_UNAVAILABLE} = CommonResponseStatus;

export default class ChaincodeLifecycleOperation extends ChaincodeAction {
	/**
	 *
	 * @param peers
	 * @param user
	 * @param channel
	 * @param logger
	 */
	constructor(peers, user, channel = emptyChannel(''), logger = console) {
		super(peers, user, channel);
		const proposal = new LifecycleProposal(this.identityContext, this.endorsers, channel, logger);
		Object.assign(this, {logger, proposal});
	}

	static _defaultVersion(sequence) {
		return sequence.toString();
	}

	/**
	 * Install phase does not require `init_required` flag, neither this.channel as valid object
	 * @param chaincodePackagePath
	 * @param [requestTimeout]
	 * @return {Promise<*>}
	 */
	async install(chaincodePackagePath, requestTimeout) {
		const {proposal} = this;
		return await proposal.installChaincode(chaincodePackagePath, requestTimeout || 30000 * this.endorsers.length);
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
		lifecycleProposal.init_required = init_required;

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
		const {proposal} = this;
		this.assign(proposal);
		const result = await proposal.approveForMyOrg({
			name,
			version,
			sequence,
		}, PackageID);

		const _commit = async () => {
			const commitResult = await proposal.commit([orderer.committer]);

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

			CommitSuccess(commitResult);
		};

		proposal.setCommitResultAssert(null);
		await _commit();


		const eventHub = this.newEventHub();
		try {
			const eventHubQuery = new EventHubQuery(eventHub, this.identityContext);
			await eventHubQuery.waitForTx();
		} finally {
			eventHub.disconnect();
		}
		return result;
	}

	async checkCommitReadiness({name, sequence, version}) {
		version = version || ChaincodeLifecycleOperation._defaultVersion(sequence);

		const {proposal} = this;
		this.assign(proposal);
		const result = await proposal.checkCommitReadiness({name, version, sequence});
		return result.queryResults;
	}

	async commitChaincodeDefinition({name, sequence, version = ChaincodeLifecycleOperation._defaultVersion(sequence)}, orderer) {

		const {proposal} = this;
		this.assign(proposal);
		const result = await proposal.commitChaincodeDefinition({name, version, sequence});
		const commitResult = await proposal.commit([orderer.committer]);
		this.logger.debug('commitChaincodeDefinition:commit', commitResult);
		const eventHub = this.newEventHub();
		try {
			const eventHubQuery = new EventHubQuery(eventHub, this.identityContext);
			await eventHubQuery.waitForTx();
		} finally {
			eventHub.disconnect();
		}

		return result;
	}

	async queryChaincodeDefinition(name) {
		const {proposal} = this;
		const result = await proposal.queryChaincodeDefinition(name);
		return result.queryResults;
	}
}




