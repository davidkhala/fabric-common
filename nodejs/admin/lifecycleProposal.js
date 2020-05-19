const ProposalManager = require('./proposal');
const {
	SystemChaincodeID: {LifeCycle}, SystemChaincodeFunctions: {
		_lifecycle: {InstallChaincode, QueryInstalledChaincodes, QueryInstalledChaincode, ApproveChaincodeDefinitionForMyOrg}
	}
} = require('khala-fabric-formatter/systemChaincode');
const fabprotos = require('fabric-protos');
const lifeCycleProtos = fabprotos.lifecycle;
const fs = require('fs');
const {getResponses} = require('khala-fabric-formatter/proposalResponse');

class LifeCycleProposal extends ProposalManager {
	constructor(identityContext, channelName, peers) {
		super(identityContext, channelName, LifeCycle, peers);
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
		responses.forEach((response, index) => {
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
	async approveForMyOrg({name, version = '', endorsement_plugin = '', validation_plugin = '', sequence, init_required, validation_parameter}, PackageID) {
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
		const argsProto = new lifeCycleProtos.ApproveChaincodeDefinitionForMyOrgArgs();
		argsProto.setSequence(sequence);
		argsProto.setName(name);
		argsProto.setVersion(version);

		argsProto.setEndorsementPlugin(endorsement_plugin);
		argsProto.setValidationPlugin(validation_plugin);
		if (!validation_parameter) {
			console.debug('WIP');
		} else {
			argsProto.setValidationParameter(validation_parameter);
		}

		// const collections;//protos.CollectionConfigPackage
		// argsProto.setCollections(collections);

		argsProto.setInitRequired(init_required);
		argsProto.setSource(source);
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: ApproveChaincodeDefinitionForMyOrg,
			args: [argsProto.toBuffer()],
		};
		const result = await this.send(buildProposalRequest);
		console.debug(getResponses(result));
		return result;
	}


}

module.exports = LifeCycleProposal;


