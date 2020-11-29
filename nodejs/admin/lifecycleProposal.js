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
const {
	CheckCommitReadinessArgs, InstallChaincodeResult, QueryInstalledChaincodeResult, QueryInstalledChaincodesResult,
	CheckCommitReadinessResult, QueryChaincodeDefinitionResult, QueryChaincodeDefinitionsResult, ChaincodeSource,
	ApproveChaincodeDefinitionForMyOrgArgs, CommitChaincodeDefinitionArgs, InstallChaincodeArgs,
	QueryChaincodeDefinitionArgs, QueryChaincodeDefinitionsArgs,
} = lifeCycleProtos;
const fs = require('fs');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');

const {ApplicationPolicy, CollectionConfigPackage} = protosProtos;


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
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: InstallChaincode,
			args: [InstallChaincodeArgs.encode({chaincode_install_package: fileContent}).finish()],
		};
		const result = await this.send(buildProposalRequest, {requestTimeout});
		getResponses(result).forEach((response) => {
			const {package_id, label} = InstallChaincodeResult.decode(response.payload);
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
		const collectionConfigPackage = new CollectionConfigPackage();
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
		const {QueryInstalledChaincodeArgs, QueryInstalledChaincodesArgs} = lifeCycleProtos;
		if (packageId) {
			args = [QueryInstalledChaincodeArgs.encode({package_id: packageId}).finish()];
		} else {
			args = [QueryInstalledChaincodesArgs.encode({}).finish()];
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
				const {package_id, label, references} = QueryInstalledChaincodeResult.decode(response.payload);
				const References = {};
				references.forEach((value, key) => {
					References[key] = value;
				});
				return {package_id, label, references: References};
			} else {
				const {installed_chaincodes} = QueryInstalledChaincodesResult.decode(response.payload);
				const installedChaincodes = {};
				for (const {package_id, label, references} of installed_chaincodes) {
					installedChaincodes[package_id] = {};
					for (const [key, value] of Object.entries(references)) {
						installedChaincodes[package_id][key] = value;
					}
				}

				return installedChaincodes;
			}
		});

		return result;
	}

	setValidationParameter(applicationPolicy) {
		this.validation_parameter = ApplicationPolicy.encode(applicationPolicy).finish();
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
		const source = new ChaincodeSource();

		if (PackageID) {
			const localPackage = new ChaincodeSource.Local();
			localPackage.package_id = PackageID;
			source.local_package = localPackage;
			source.Type = 'local_package';
		} else {
			source.unavailable = new ChaincodeSource.Unavailable();
			source.Type = 'unavailable';
		}

		const approveChaincodeDefinitionForMyOrgArgs = {
			sequence, name, version, source,
		};

		this._propertyAssign(approveChaincodeDefinitionForMyOrgArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: ApproveChaincodeDefinitionForMyOrg,
			args: [ApproveChaincodeDefinitionForMyOrgArgs.encode(approveChaincodeDefinitionForMyOrgArgs).finish()],
		};
		return await this.send(buildProposalRequest);
	}


	async checkCommitReadiness({name, version, sequence}) {
		this.asQuery();
		const checkCommitReadinessArgs = {
			sequence, name, version
		};

		this._propertyAssign(checkCommitReadinessArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest2 = {
			fcn: CheckCommitReadiness,
			args: [CheckCommitReadinessArgs.encode(checkCommitReadinessArgs).finish()]
		};
		const result = await this.send(buildProposalRequest2);

		const {queryResults} = result;
		result.queryResults = queryResults.map(payload => CheckCommitReadinessResult.decode(payload).approvals);
		return result;

	}

	/**
	 * if default docker chaincode runtime is used. the chaincode container is created during endorse
	 * @param sequence
	 * @param name
	 * @param version
	 */
	async commitChaincodeDefinition({sequence, name, version}) {
		const commitChaincodeDefinitionArgs = {
			sequence, name, version
		};
		this._propertyAssign(commitChaincodeDefinitionArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: CommitChaincodeDefinition,
			args: [CommitChaincodeDefinitionArgs.encode(commitChaincodeDefinitionArgs).finish()],
		};
		return await this.send(buildProposalRequest);
	}

	async queryChaincodeDefinition(name) {
		let fcn;
		let args;
		this.asQuery();
		if (name) {
			fcn = QueryChaincodeDefinition;
			args = [QueryChaincodeDefinitionArgs.encode({name}).finish()];
		} else {
			fcn = QueryChaincodeDefinitions;
			args = [QueryChaincodeDefinitionsArgs.encode({}).finish()];
		}

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {fcn, args};
		const result = await this.send(buildProposalRequest);

		const {queryResults} = result;
		const singleChaincodeDefinitionAmend = (chaincodeDefinition) => {
			chaincodeDefinition.validation_parameter = ApplicationPolicy.decode(chaincodeDefinition.validation_parameter);
			return chaincodeDefinition;
		};
		const decodedQueryResults = queryResults.map(payload => {

			if (name) {
				const resultSingle = QueryChaincodeDefinitionResult.decode(payload);
				return singleChaincodeDefinitionAmend(resultSingle);
			} else {
				const {chaincode_definitions} = QueryChaincodeDefinitionsResult.decode(payload);
				return chaincode_definitions.map(definition => {
					const resultSingle = QueryChaincodeDefinitionsResult.ChaincodeDefinition.decode(definition);
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


