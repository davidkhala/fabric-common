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
const lifeCycleProtos = fabprotos.lifecycle;
const fs = require('fs');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');

class LifeCycleProposal extends ProposalManager {
	constructor(identityContext, channelName, endorsers) {
		super(identityContext, channelName, LifeCycle, endorsers);
	}

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
		////
		const responses = getResponses(result);
		responses.forEach((response) => {
			const {package_id, label} = lifeCycleProtos.InstallChaincodeResult.decode(response.payload);
			Object.assign(response, {
				package_id, label,
			});
		});
		return result;
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
		////
		const responses = getResponses(result);
		responses.forEach((response) => {
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

	//
	//
	// validation_parameter: Bytes:
	// TODO WIP
	/**
	 * Chaincode is approved at the organization level, so the command only needs to target one peer.
	 * Because the chaincode is being deployed to the channel for the first time, the sequence number is 1
	 *
	 * @param name
	 * @param version chaincodeVersion TODO could it be empty
	 * @param endorsement_plugin
	 * @param validation_plugin
	 * @param {number} sequence starting from 1
	 * @param {boolean} init_required
	 * @param {Buffer} validation_parameter policyBytes of new protosProtos.ApplicationPolicy()
	 * @param PackageID
	 * @return {Promise<void>}
	 */
	async approveForMyOrg({name, version = '', endorsement_plugin = '', validation_plugin = '', sequence, validation_parameter}, PackageID) {
		const source = new lifeCycleProtos.ChaincodeSource();


		if (PackageID) {
			const localPackage = new lifeCycleProtos.ChaincodeSource.Local();
			localPackage.setPackageId(PackageID);
			source.setLocalPackage(localPackage);
		} else {
			const unavailable = new lifeCycleProtos.ChaincodeSource.Unavailable();
			source.setUnavailable(unavailable);
		}


		// const applicationPolicy = new protosProtos.ApplicationPolicy()
		// const signaturePolicyEnvelop

		// common.SignaturePolicyEnvelope
		// int32 version = 1;
		// SignaturePolicy rule = 2;
		// repeated MSPPrincipal identities = 3;


		// message ApproveChaincodeDefinitionForMyOrgArgs {
		// 	int64 sequence = 1;
		// 	string name = 2;
		// 	string version = 3;
		// 	string endorsement_plugin = 4;
		// 	string validation_plugin = 5;
		// 	bytes validation_parameter = 6;
		// 	protos.CollectionConfigPackage collections = 7;
		// 	bool init_required = 8;
		// 	ChaincodeSource source = 9;
		// }
		const approveChaincodeDefinitionForMyOrgArgs = new lifeCycleProtos.ApproveChaincodeDefinitionForMyOrgArgs();
		approveChaincodeDefinitionForMyOrgArgs.setSequence(sequence);
		approveChaincodeDefinitionForMyOrgArgs.setName(name);
		approveChaincodeDefinitionForMyOrgArgs.setVersion(version);

		approveChaincodeDefinitionForMyOrgArgs.setEndorsementPlugin(endorsement_plugin);
		approveChaincodeDefinitionForMyOrgArgs.setValidationPlugin(validation_plugin);
		if (!validation_parameter) {
			console.debug('WIP');
		} else {
			approveChaincodeDefinitionForMyOrgArgs.setValidationParameter(validation_parameter);
		}

		// const collections;//protos.CollectionConfigPackage
		// argsProto.setCollections(collections);

		approveChaincodeDefinitionForMyOrgArgs.setInitRequired(false);// TODO FIXME
		approveChaincodeDefinitionForMyOrgArgs.setSource(source);
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: ApproveChaincodeDefinitionForMyOrg,
			args: [approveChaincodeDefinitionForMyOrgArgs.toBuffer()],
		};
		const result = await this.send(buildProposalRequest);
		return result;
	}


	async checkCommitReadiness({name, version = '', endorsement_plugin = '', validation_plugin = '', sequence, validation_parameter}) {
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
		checkCommitReadinessArgs.setInitRequired(false);

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

	async commitChaincodeDefinition({sequence, name, version, endorsement_plugin = '', validation_plugin = '', validation_parameter}) {
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
		commitChaincodeDefinitionArgs.setInitRequired(false);


		if (!validation_parameter) {
			console.debug('WIP');
		} else {
			commitChaincodeDefinitionArgs.setValidationParameter(validation_parameter);
		}

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {fcn: CommitChaincodeDefinition, args: [commitChaincodeDefinitionArgs.toBuffer()]};
		const result = await this.send(buildProposalRequest);
		console.debug('commitChaincodeDefinition', getResponses(result));
		return result;
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
				console.debug('queryChaincodeDefinition', amend);
				Object.assign(response, amend);
			} else {
				//message QueryChaincodeDefinitionsResult {
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
				for (const chaincode_definition of chaincode_definitions) {
					console.debug('queryChaincodeDefinition', chaincode_definition);
				}
			}
		});
		console.debug('queryChaincodeDefinition', getResponses(result));


		return result;
	}


}

module.exports = LifeCycleProposal;


