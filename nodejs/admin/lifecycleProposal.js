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

		installChaincodeArgs.setChaincodeInstallPackage(fileContent);
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: InstallChaincode,
			args: [installChaincodeArgs.toBuffer()],
		};
		const result = await this.send(buildProposalRequest, {requestTimeout});
		const responses = getResponses(result);
		responses.forEach((response) => {
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
		collectionConfigPackage.setConfig(collectionConfigs);
		this.collectionConfigPackage = collectionConfigPackage;
	}

	_propertyAssign(protobufMessage) {
		const {endorsement_plugin, init_required, validation_plugin, validation_parameter, collectionConfigPackage} = this;
		if (endorsement_plugin) {
			protobufMessage.setEndorsementPlugin(endorsement_plugin);
		}
		if (init_required) {
			protobufMessage.setInitRequired(init_required);
		}
		if (validation_plugin) {
			protobufMessage.setValidationPlugin(validation_plugin);
		}
		if (validation_parameter) {
			protobufMessage.setValidationParameter(validation_parameter);
		} else {
			this.logger.info('apply default endorsement policy');
		}
		if (collectionConfigPackage) {
			protobufMessage.setCollections(collectionConfigPackage);
			this.logger.info('private data enabled');
		}
	}

	/**
	 *
	 * @param {string} [packageId] if specified, only query for single chaincode
	 */
	async queryInstalledChaincodes(packageId) {
		let args;
		if (packageId) {
			const queryInstalledChaincodeArgs = new lifeCycleProtos.QueryInstalledChaincodeArgs();
			queryInstalledChaincodeArgs.setPackageId(packageId);
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
		getResponses(result).forEach((response) => {
			const amend = {};
			if (packageId) {
				const {package_id, label, references} = lifeCycleProtos.QueryInstalledChaincodeResult.decode(response.payload);
				const References = {};
				references.forEach((value, key) => {
					References[key] = value;
				});
				Object.assign(amend, {package_id, label, references: References});
			} else {
				const {installed_chaincodes} = lifeCycleProtos.QueryInstalledChaincodesResult.decode(response.payload);
				const installedChaincodes = {};
				for (const {package_id, label, references} of installed_chaincodes) {
					installedChaincodes[package_id] = {};
					references.forEach((value, key) => {
						installedChaincodes[package_id][key] = value;
					});
				}

				Object.assign(amend, {installed_chaincodes: installedChaincodes});
			}

			Object.assign(response, amend);

		});

		return result;
	}

	static buildValidationParameter({signature_policy, channel_config_policy_reference}) {
		const applicationPolicy = new protosProtos.ApplicationPolicy();

		if (channel_config_policy_reference) {
			applicationPolicy.setChannelConfigPolicyReference(channel_config_policy_reference);
		} else if (signature_policy) {
			applicationPolicy.setSignaturePolicy(signature_policy);
		}
		return applicationPolicy.toBuffer();
	}

	setValidationParameter(validation_parameter) {
		this.validation_parameter = validation_parameter;
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
			localPackage.setPackageId(PackageID);
			source.setLocalPackage(localPackage);
			source.Type = 'local_package';
		} else {
			const unavailable = new lifeCycleProtos.ChaincodeSource.Unavailable();
			source.setUnavailable(unavailable);
			source.Type = 'unavailable';
		}

		const approveChaincodeDefinitionForMyOrgArgs = new lifeCycleProtos.ApproveChaincodeDefinitionForMyOrgArgs();
		approveChaincodeDefinitionForMyOrgArgs.setSequence(sequence);
		approveChaincodeDefinitionForMyOrgArgs.setName(name);
		approveChaincodeDefinitionForMyOrgArgs.setVersion(version);

		this._propertyAssign(approveChaincodeDefinitionForMyOrgArgs);

		approveChaincodeDefinitionForMyOrgArgs.setSource(source);
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
		// message CheckCommitReadinessArgs {
		//     int64 sequence = 1;
		//     string name = 2;
		//     string version = 3;
		//     string endorsement_plugin = 4;
		//     string validation_plugin = 5;
		//     bytes validation_parameter = 6;
		//     protos.CollectionConfigPackage collections = 7;
		//     bool init_required = 8;
		// }
		const checkCommitReadinessArgs = new lifeCycleProtos.CheckCommitReadinessArgs();
		checkCommitReadinessArgs.setSequence(sequence);
		checkCommitReadinessArgs.setName(name);
		checkCommitReadinessArgs.setVersion(version);
		this._propertyAssign(checkCommitReadinessArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest2 = {
			fcn: CheckCommitReadiness,
			args: [checkCommitReadinessArgs.toBuffer()]
		};
		const result = await this.send(buildProposalRequest2);

		getResponses(result).forEach((response) => {
			const {approvals} = lifeCycleProtos.CheckCommitReadinessResult.decode(response.payload);
			if (approvals.size !== 0) {
				response.approvals = {};
				approvals.forEach((value, key) => {
					response.approvals[key] = value;
				});
			}
		});
		return result;

	}

	/**
	 * if default docker chaincode runtime is used. the chaincode container is created during endorse
	 * @param sequence
	 * @param name
	 * @param version
	 */
	async commitChaincodeDefinition({sequence, name, version}) {
		// message CommitChaincodeDefinitionArgs {
		// 	int64 sequence = 1;
		// 	string name = 2;
		// 	string version = 3;
		// 	string endorsement_plugin = 4;
		// 	string validation_plugin = 5;
		// 	bytes validation_parameter = 6;
		// 	protos.CollectionConfigPackage collections = 7;
		// 	bool init_required = 8;
		// }
		const commitChaincodeDefinitionArgs = new lifeCycleProtos.CommitChaincodeDefinitionArgs();
		commitChaincodeDefinitionArgs.setSequence(sequence);
		commitChaincodeDefinitionArgs.setName(name);
		commitChaincodeDefinitionArgs.setVersion(version);
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
		if (name) {
			fcn = QueryChaincodeDefinition;
			const queryChaincodeDefinitionArgs = new lifeCycleProtos.QueryChaincodeDefinitionArgs();
			queryChaincodeDefinitionArgs.setName(name);
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


		getResponses(result).forEach((response) => {
			if (name) {
				// message QueryChaincodeDefinitionResult {
				// 	int64 sequence = 1;
				// 	string version = 2;
				// 	string endorsement_plugin = 3;
				// 	string validation_plugin = 4;
				// 	bytes validation_parameter = 5;
				// 	protos.CollectionConfigPackage collections = 6;
				// 	bool init_required = 7;
				// 	map<string,bool> approvals = 8;
				// }
				const amend = lifeCycleProtos.QueryChaincodeDefinitionResult.decode(response.payload);
				const approvals = {};
				amend.approvals.forEach((value, key) => {
					approvals[key] = value;
				});
				amend.approvals = approvals;
				amend.validation_parameter = protosProtos.ApplicationPolicy.decode(amend.validation_parameter);

				Object.assign(response, amend);
			} else {
				// message QueryChaincodeDefinitionsResult {
				//     message ChaincodeDefinition {
				//         string name = 1;
				//         int64 sequence = 2;
				//         string version = 3;
				//         string endorsement_plugin = 4;
				//         string validation_plugin = 5;
				//         bytes validation_parameter = 6;
				//         protos.CollectionConfigPackage collections = 7;
				//         bool init_required = 8;
				//     }
				//     repeated ChaincodeDefinition chaincode_definitions = 1;
				// }
				const {chaincode_definitions} = lifeCycleProtos.QueryChaincodeDefinitionsResult.decode(response.payload);
				Object.assign(response, {chaincode_definitions});
			}
		});

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


