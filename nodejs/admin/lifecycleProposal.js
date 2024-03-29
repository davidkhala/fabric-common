import ProposalManager from './proposal.js';
import {SystemChaincodeFunctions} from 'khala-fabric-formatter/systemChaincode.js';
import fabprotos from 'fabric-protos';
import {SystemChaincodeID} from 'khala-fabric-formatter/constants.js';
import {BufferFrom} from 'khala-fabric-formatter/protobuf.js';
import fs from 'fs';
import {getResponses} from 'khala-fabric-formatter/proposalResponse.js';
import {CommitSuccess, EndorseALL} from './resultInterceptors.js';

const {
	InstallChaincode, QueryInstalledChaincodes, QueryInstalledChaincode, ApproveChaincodeDefinitionForMyOrg,
	QueryChaincodeDefinition, QueryChaincodeDefinitions, CheckCommitReadiness, CommitChaincodeDefinition
} = SystemChaincodeFunctions._lifecycle;
const {LifeCycle} = SystemChaincodeID;

const protosProtos = fabprotos.protos;
const lifeCycleProtos = fabprotos.lifecycle;
const {
	CheckCommitReadinessArgs, InstallChaincodeResult, QueryInstalledChaincodeResult, QueryInstalledChaincodesResult,
	CheckCommitReadinessResult, QueryChaincodeDefinitionResult, QueryChaincodeDefinitionsResult, ChaincodeSource,
	ApproveChaincodeDefinitionForMyOrgArgs, CommitChaincodeDefinitionArgs, InstallChaincodeArgs,
	QueryChaincodeDefinitionArgs,
} = lifeCycleProtos;

const {ApplicationPolicy, CollectionConfigPackage} = protosProtos;

export function hasInstalled(response, packageId) {
	const {status, message} = response;
	let messageMatch;
	const prefix = `failed to invoke backing implementation of 'InstallChaincode': chaincode already successfully installed`;
	const pattern = `${prefix} (package ID '${packageId}')`;
	if (packageId) {
		messageMatch = message === pattern;
	} else {
		messageMatch = message.startsWith(prefix);
	}

	return status === 500 && messageMatch;
}

/**
 * @return ProposalResultHandler
 */
const skipIfInstalled = (packageId) => {
	return (result) => EndorseALL(result, ({response}) => {
		return !hasInstalled(response, packageId);
	});
};
/**
 * @return ProposalResultHandler
 */
const skipIfNoChange = (chaincodeID, sequence) => {
	return (result) => EndorseALL(result, ({response}) => {
		return !hasNoChange(response, chaincodeID, sequence);
	});
};

export function hasNoChange(response, chaincodeID, sequence) {
	const pattern = `failed to invoke backing implementation of 'ApproveChaincodeDefinitionForMyOrg': attempted to redefine uncommitted sequence (${sequence}) for namespace ${chaincodeID} with unchanged content`;
	const {status, message, payload} = response;
	return status === 500 && message === pattern && payload.length === 0;
}

export function hasNoDefinition(response, chaincodeID) {
	const {status, message, payload} = response;
	return status === 404 && message === `namespace ${chaincodeID} is not defined` && payload.length === 0;
}

/**
 *
 * @param {string} [chaincodeID]
 * @return ProposalResultHandler
 */
const skipIfNoDefinition = (chaincodeID) => {
	if (chaincodeID) {
		return (result) => EndorseALL(result, ({response}) => {
			return !hasNoDefinition(response, chaincodeID);
		});
	} else {
		return EndorseALL;
	}
};

export default class LifecycleProposal extends ProposalManager {
	/**
	 *
	 * @param {IdentityContext} identityContext
	 * @param {Endorser[]} endorsers
	 * @param {Channel} channel
	 * @param [logger]
	 */
	constructor(identityContext, endorsers, channel, logger = console) {
		super(identityContext, endorsers, LifeCycle, channel);
		this.logger = logger;

		/**
		 * new chaincode lifeCycle do not have init phase. Init function is optional in chaincode entrance
		 * Be careful: init_required information is indexing information in chaincode definition.
		 * @type {boolean}
		 */
		this.init_required = true;
		this.resultHandler = null;
		this.commitResultAssert = CommitSuccess;
	}


	/**
	 * if default docker chaincode runtime is configured. the chaincode image is created during endorse
	 * @param {string} packageTarGz file absolute path
	 * @param [packageId]
	 * @param [requestTimeout]
	 * @return {Promise<*>}
	 */
	async installChaincode(packageTarGz, packageId, requestTimeout) {
		const fileContent = fs.readFileSync(packageTarGz);
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: InstallChaincode,
			args: [BufferFrom({chaincode_install_package: fileContent}, InstallChaincodeArgs)],
		};
		this.resultHandler = skipIfInstalled(packageId);
		const result = await this.send(buildProposalRequest, {requestTimeout});

		const responses = getResponses(result);
		if (responses.every((response) => {
			return hasInstalled(response, packageId);
		})) {
			result.installed = true;
		}

		result.queryResults = responses.map((response) => {
			const {package_id, label} = InstallChaincodeResult.decode(response.payload);
			return {package_id, label};
		});

		this.resultHandler = null;
		return result;
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
		const {QueryInstalledChaincodeArgs} = lifeCycleProtos;
		if (packageId) {
			args = [BufferFrom({package_id: packageId}, QueryInstalledChaincodeArgs)];
		} else {
			args = [Buffer.from('')]; // lifeCycleProtos.QueryInstalledChaincodesArgs.encode({}).finish()
		}
		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: packageId ? QueryInstalledChaincode : QueryInstalledChaincodes,
			args,
		};
		const result = await this.send(buildProposalRequest);
		const parseReferences = ({references}) => {
			const _result = {};
			for (const [key, value] of Object.entries(references)) {
				_result[key] = value;
			}
			return _result;
		};

		result.queryResults = getResponses(result).map(response => {
			if (packageId) {
				const {package_id, label, references} = QueryInstalledChaincodeResult.decode(response.payload);
				return {
					[package_id]: parseReferences({references})
				};
			} else {
				const {installed_chaincodes} = QueryInstalledChaincodesResult.decode(response.payload);
				const installedChaincodes = {};
				for (const {package_id, label, references} of installed_chaincodes) {
					installedChaincodes[package_id] = parseReferences({references});
				}

				return installedChaincodes;
			}
		});

		return result;
	}

	setValidationParameter(applicationPolicy) {
		this.validation_parameter = BufferFrom(applicationPolicy, ApplicationPolicy);
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
			args: [BufferFrom(approveChaincodeDefinitionForMyOrgArgs, ApproveChaincodeDefinitionForMyOrgArgs)],
		};
		this.resultHandler = skipIfNoChange(name, sequence);

		const result = await this.send(buildProposalRequest);
		if (getResponses(result).every((response) => {
			return hasNoChange(response, name, sequence);
		})) {
			result.noChange = true;
		}
		return result;
	}


	async checkCommitReadiness({name, version, sequence}) {
		const checkCommitReadinessArgs = {
			sequence, name, version
		};

		this._propertyAssign(checkCommitReadinessArgs);

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {
			fcn: CheckCommitReadiness,
			args: [BufferFrom(checkCommitReadinessArgs, CheckCommitReadinessArgs)]
		};
		const result = await this.send(buildProposalRequest);

		result.queryResults = getResponses(result).map(({payload}) => CheckCommitReadinessResult.decode(payload).approvals);
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
			args: [BufferFrom(commitChaincodeDefinitionArgs, CommitChaincodeDefinitionArgs)],
		};
		return await this.send(buildProposalRequest);
	}

	async queryChaincodeDefinition(name) {
		let fcn;
		let args;
		if (name) {
			fcn = QueryChaincodeDefinition;
			args = [BufferFrom({name}, QueryChaincodeDefinitionArgs)];
		} else {
			fcn = QueryChaincodeDefinitions;
			args = [Buffer.from('')]; // lifeCycleProtos.QueryChaincodeDefinitionsArgs
		}

		/**
		 * @type {BuildProposalRequest}
		 */
		const buildProposalRequest = {fcn, args};
		this.resultHandler = skipIfNoDefinition(name);
		const result = await this.send(buildProposalRequest);
		const singleChaincodeDefinitionAmend = (chaincodeDefinition) => {
			chaincodeDefinition.validation_parameter = ApplicationPolicy.decode(chaincodeDefinition.validation_parameter);
			return chaincodeDefinition;
		};


		const responses = getResponses(result);
		if (responses.every((response) => {
			return hasNoDefinition(response, name);
		})) {
			result.notFound = true;
		}

		result.queryResults = responses.map(({payload}) => {
			if (name) {
				const resultSingle = QueryChaincodeDefinitionResult.decode(payload);
				resultSingle.sequence = resultSingle.sequence.toInt();
				return singleChaincodeDefinitionAmend(resultSingle);
			} else {
				const {chaincode_definitions} = QueryChaincodeDefinitionsResult.decode(payload);
				return chaincode_definitions.map(definition => {
					const resultSingle = QueryChaincodeDefinitionsResult.ChaincodeDefinition.decode(definition);
					return singleChaincodeDefinitionAmend(resultSingle);
				});
			}
		});


		return result;
	}

}
