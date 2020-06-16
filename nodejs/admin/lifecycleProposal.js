const ProposalManager = require('./proposal');
const {
	SystemChaincodeID: {LifeCycle},
	SystemChaincodeFunctions: {
		_lifecycle: {
			InstallChaincode, QueryInstalledChaincodes, QueryInstalledChaincode, ApproveChaincodeDefinitionForMyOrg,
			QueryChaincodeDefinition, QueryChaincodeDefinitions, CheckCommitReadiness, CommitChaincodeDefinition
		}
	}
} = require('khala-fabric-formatter/systemChaincode');
const fabprotos = require('fabric-protos');
const protosProtos = fabprotos.protos;
const lifeCycleProtos = fabprotos.lifecycle;
const fs = require('fs');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');

class LifecycleProposal extends ProposalManager {
	/**
	 *
	 * @param {Client.IdentityContext} identityContext
	 * @param {Client.Channel} channel
	 * @param {Client.Endorser[]} endorsers
	 * @param [logger]
	 */
	constructor(identityContext, channel, endorsers, logger = console) {
		super(identityContext, channel, LifeCycle, endorsers);
		this.logger = logger;
		this.init_required = true;
	}

	/**
	 * if default docker chaincode runtime is configured. the chaincode image is created during endorse
	 * @param {string} packageTarGz file absolute path
	 * @param [requestTimeout]
	 * @return {Promise<*>}
	 */
	async installChaincode(packageTarGz, requestTimeout = 30000) {
		const fileContent = fs.readFileSync(packageTarGz);
		const installChaincodeArgs = new lifeCycleProtos.InstallChaincodeArgs();

		installChaincodeArgs.chaincode_install_package = fileContent;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: InstallChaincode,
			args: [installChaincodeArgs.toBuffer()],
		};
		const result = await this.send(buildProposalRequest, {requestTimeout});
		getResponses(result).forEach((response) => {
			const {package_id, label} = lifeCycleProtos.InstallChaincodeResult.decode(response.payload);
			Object.assign(response, {
				package_id, label,
			});
		});
		return result;
	}


	setEndorsementPlugin(endorsement_plugin) {
		this.endorsement_plugin = endorsement_plugin;
	}

	setValidationPlugin(validation_plugin) {
		this.validation_plugin = validation_plugin;
	}

	/**
	 * new chaincode lifeCycle do not have initialize phase. Thus Init function is optional in chaincode entrance
	 * Be careful: init_required information is indexing information in chaincode definition.
	 * @param {boolean} init_required
	 */
	setInitRequired(init_required) {
		this.init_required = init_required;
	}

	setCollectionConfigPackage(collectionConfigs) {
		const collectionConfigPackage = new protosProtos.CollectionConfigPackage();
		collectionConfigPackage.config = collectionConfigs;
		this.collectionConfigPackage = collectionConfigPackage;
	}

	_propertyAssign(protobufMessage) {
		const {endorsement_plugin, init_required, validation_plugin, validation_parameter, collectionConfigPackage} = this;
		if (endorsement_plugin) {
			protobufMessage.endorsement_plugin = endorsement_plugin;
		}
		if (init_required) {
			protobufMessage.init_required = init_required;
		}
		if (validation_plugin) {
			protobufMessage.validation_plugin = validation_plugin;
		}
		if (validation_parameter) {
			protobufMessage.validation_parameter = validation_parameter;
		} else {
			this.logger.info('apply default endorsement policy');
		}
		if (collectionConfigPackage) {
			protobufMessage.collections = collectionConfigPackage;
			this.logger.info('private data enabled');
		}
	}

	/**
	 * @param {string} [packageId] if specified, only query for single chaincode
	 */
	async queryInstalledChaincodes(packageId) {
		let args;
		if (packageId) {
			const queryInstalledChaincodeArgs = new lifeCycleProtos.QueryInstalledChaincodeArgs();
			queryInstalledChaincodeArgs.package_id = packageId;
			args = [queryInstalledChaincodeArgs.toBuffer()];
		} else {
			const queryInstalledChaincodesArgs = new lifeCycleProtos.QueryInstalledChaincodesArgs();
			args = [queryInstalledChaincodesArgs.toBuffer()];
		}
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: packageId ? QueryInstalledChaincode : QueryInstalledChaincodes,
			args,
		};
		const result = await this.send(buildProposalRequest);
		result.queryResults = getResponses(result).map(response => {
			if (packageId) {
				const {package_id, label, references} = lifeCycleProtos.QueryInstalledChaincodeResult.decode(response.payload);
				const References = {};
				references.forEach((value, key) => {
					References[key] = value;
				});
				return {package_id, label, references: References};
			} else {
				const {installed_chaincodes} = lifeCycleProtos.QueryInstalledChaincodesResult.decode(response.payload);
				const installedChaincodes = {};
				for (const {package_id, label, references} of installed_chaincodes) {
					installedChaincodes[package_id] = {};
					references.forEach((value, key) => {
						installedChaincodes[package_id][key] = value;
					});
				}

				return installedChaincodes;
			}
		});

		return result;
	}

	static buildApplicationPolicy({signature_policy, channel_config_policy_reference}) {
		const applicationPolicy = new protosProtos.ApplicationPolicy();

		if (channel_config_policy_reference) {
			applicationPolicy.channel_config_policy_reference = channel_config_policy_reference;
		} else if (signature_policy) {
			applicationPolicy.signature_policy = signature_policy;
		}
		return applicationPolicy;
	}

	setValidationParameter(applicationPolicy) {
		this.validation_parameter = applicationPolicy.toBuffer();
	}

	/**
	 * Chaincode is approved at the organization level, so the command only needs to target one peer.
	 *
	 *
	 * @param name
	 * @param version chaincodeVersion
	 * @param {number} sequence starting from 1
	 * @param PackageID
	 */
	async approveForMyOrg({name, version, sequence}, PackageID) {
		const source = new lifeCycleProtos.ChaincodeSource();

		if (PackageID) {
			const localPackage = new lifeCycleProtos.ChaincodeSource.Local();
			localPackage.package_id = PackageID;
			source.local_package = localPackage;
			source.Type = 'local_package';
		} else {
			source.unavailable = new lifeCycleProtos.ChaincodeSource.Unavailable();
			source.Type = 'unavailable';
		}

		const approveChaincodeDefinitionForMyOrgArgs = new lifeCycleProtos.ApproveChaincodeDefinitionForMyOrgArgs();
		approveChaincodeDefinitionForMyOrgArgs.sequence = sequence;
		approveChaincodeDefinitionForMyOrgArgs.name = name;
		approveChaincodeDefinitionForMyOrgArgs.version = version;

		this._propertyAssign(approveChaincodeDefinitionForMyOrgArgs);

		approveChaincodeDefinitionForMyOrgArgs.source = source;
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: ApproveChaincodeDefinitionForMyOrg,
			args: [approveChaincodeDefinitionForMyOrgArgs.toBuffer()],
		};
		return await this.send(buildProposalRequest);
	}


	async checkCommitReadiness({name, version, sequence}) {
		this.asQuery();
		const checkCommitReadinessArgs = new lifeCycleProtos.CheckCommitReadinessArgs();
		checkCommitReadinessArgs.sequence = sequence;
		checkCommitReadinessArgs.name = name;
		checkCommitReadinessArgs.version = version;
		this._propertyAssign(checkCommitReadinessArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest2 = {
			fcn: CheckCommitReadiness,
			args: [checkCommitReadinessArgs.toBuffer()]
		};
		const result = await this.send(buildProposalRequest2);

		const {queryResults} = result;
		const decodedQueryResults = queryResults.map(payload => {
			const {approvals} = lifeCycleProtos.CheckCommitReadinessResult.decode(payload);
			const returned = {};
			approvals.forEach((value, key) => {
				returned[key] = value;
			});
			return returned;
		});
		result.queryResults = decodedQueryResults;
		return result;

	}

	/**
	 * if default docker chaincode runtime is used. the chaincode container is created during endorse
	 * @param sequence
	 * @param name
	 * @param version
	 */
	async commitChaincodeDefinition({sequence, name, version}) {
		const commitChaincodeDefinitionArgs = new lifeCycleProtos.CommitChaincodeDefinitionArgs();
		commitChaincodeDefinitionArgs.sequence = sequence;
		commitChaincodeDefinitionArgs.name = name;
		commitChaincodeDefinitionArgs.version = version;
		this._propertyAssign(commitChaincodeDefinitionArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: CommitChaincodeDefinition,
			args: [commitChaincodeDefinitionArgs.toBuffer()],
		};
		return await this.send(buildProposalRequest);
	}

	async queryChaincodeDefinition(name) {
		let fcn;
		let args;
		this.asQuery();
		if (name) {
			fcn = QueryChaincodeDefinition;
			const queryChaincodeDefinitionArgs = new lifeCycleProtos.QueryChaincodeDefinitionArgs();
			queryChaincodeDefinitionArgs.name = name;
			args = [queryChaincodeDefinitionArgs.toBuffer()];
		} else {
			const queryChaincodeDefinitionsArgs = new lifeCycleProtos.QueryChaincodeDefinitionsArgs();
			fcn = QueryChaincodeDefinitions;
			args = [queryChaincodeDefinitionsArgs.toBuffer()];
		}

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {fcn, args};
		const result = await this.send(buildProposalRequest);

		const {queryResults} = result;
		const singleChaincodeDefinitionAmend = (chaincodeDefinition) => {
			const approvals = {};
			chaincodeDefinition.approvals.forEach((value, key) => {
				approvals[key] = value;
			});
			chaincodeDefinition.approvals = approvals;
			chaincodeDefinition.validation_parameter = protosProtos.ApplicationPolicy.decode(chaincodeDefinition.validation_parameter);
			return chaincodeDefinition;
		};
		const decodedQueryResults = queryResults.map(payload => {

			if (name) {
				const resultSingle = lifeCycleProtos.QueryChaincodeDefinitionResult.decode(payload);
				return singleChaincodeDefinitionAmend(resultSingle);
			} else {
				const {chaincode_definitions} = lifeCycleProtos.QueryChaincodeDefinitionsResult.decode(payload);
				return chaincode_definitions.map(definition => {
					const resultSingle = lifeCycleProtos.QueryChaincodeDefinitionsResult.ChaincodeDefinition.decode(definition);
					return singleChaincodeDefinitionAmend(resultSingle);
				});
			}
		});
		result.queryResults = decodedQueryResults;

		return result;
	}

	/**
	 * MAGIC CODE for [Illegal value for versionvalue element of type int32: object (not an integer)]
	 */
	static getFabprotos() {
		return fabprotos;
	}
}

module.exports = LifecycleProposal;


