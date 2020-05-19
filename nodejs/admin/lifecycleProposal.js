const Proposal = require('./proposal');
const {
	SystemChaincodeID: {LifeCycle}, SystemChaincodeFunctions: {
		_lifecycle: {InstallChaincode, QueryInstalledChaincodes, QueryInstalledChaincode, ApproveChaincodeDefinitionForMyOrg}
	}
} = require('khala-fabric-formatter/systemChaincode');
const fabprotos = require('fabric-protos');
const lifeCycleProtos = fabprotos.lifecycle;
const protosProtos = fabprotos.protos;
const fs = require('fs');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');

class LifeCycleProposal extends Proposal {
	constructor(identityContext, channelName, peers, requestTimeout) {
		if (!requestTimeout) {
			requestTimeout = 30000;
		}
		super(identityContext, channelName, LifeCycle, peers, requestTimeout);
	}

	async installChaincode(packageTarGz) {
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
		const result = await this.send(buildProposalRequest);
		////
		const responses = getResponses(result);
		responses.forEach((response, index) => {
			const {package_id, label} = lifeCycleProtos.InstallChaincodeResult.decode(response.payload);
			Object.assign(response, {
				package_id, label,
				endorser: this.targets[index].toString()
			});
		});
		return result;
	}

	/**
	 *
	 * @param {string} [packageId] if specified, only query for single chaincode
	 * @return {Promise<void>}
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
		responses.forEach((response, index) => {
			const amend = {
				endorser: this.targets[index].toString(),
			};
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
	async approveForMyOrg({name, version = '', endorsement_plugin = '', validation_plugin = '', sequence, init_required, validation_parameter}, PackageID) {
		const source = new lifeCycleProtos.ChaincodeSource(); //ChaincodeSource

		let sourceType;

		if (PackageID) {
			sourceType = new lifeCycleProtos.ChaincodeSource.Local();
			sourceType.setPackageId(PackageID);
		} else {
			sourceType = new lifeCycleProtos.ChaincodeSource.Unavailable();
		}

		// const applicationPolicy = new protosProtos.ApplicationPolicy()
		// const signaturePolicyEnvelop

		// common.SignaturePolicyEnvelope
		// int32 version = 1;
		// SignaturePolicy rule = 2;
		// repeated MSPPrincipal identities = 3;

		// chaincodeVersion
		// TODO signature builder

		source.setType(sourceType);
		const collections;//protos.CollectionConfigPackage


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
		const argsProto = new lifeCycleProtos.ApproveChaincodeDefinitionForMyOrgArgs();
		argsProto.setSequence(sequence);
		argsProto.setName(name);
		argsProto.setVersion(version);

		argsProto.setEndorsementPlugin(endorsement_plugin);
		argsProto.setValidationPlugin(validation_plugin);
		argsProto.setValidationParameter(validation_parameter);
		argsProto.setCollections(collections);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: ApproveChaincodeDefinitionForMyOrg,
			args: [argsProto.toBuffer()],
		};
		const result = await this.send(buildProposalRequest);
	}


}

module.exports = LifeCycleProposal;


