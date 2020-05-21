const SystemChaincodeFunctions = {
	lscc: {
		install: undefined,
		deploy: undefined,
		upgrade: undefined,
		getid: 'ChaincodeExists',
		getdepspec: 'GetDeploymentSpec',
		getccdata: 'GetChaincodeData',
		getchaincodes: 'GetChaincodes',
		getinstalledchaincodes: 'GetInstalledChaincodes',
		getcollectionsconfig: 'GetCollectionsConfig'
	},
	qscc: {
		GetBlockByNumber: 'GetBlockByNumber',
		GetChainInfo: 'GetChainInfo'
	},
	cscc: {
		JoinChain: 'JoinChain',
		GetChannels: 'GetChannels',
	},
	_lifecycle: {
		// InstallChaincodeFuncName is the chaincode function name used to install a chaincode
		InstallChaincode: 'InstallChaincode',

		// QueryInstalledChaincodeFuncName is the chaincode function name used to query SINGLE installed chaincode
		QueryInstalledChaincode: 'QueryInstalledChaincode',

		// QueryInstalledChaincodesFuncName is the chaincode function name used to query all installed chaincodes
		QueryInstalledChaincodes: 'QueryInstalledChaincodes',

		// used to approve a chaincode definition for execution by the user's own org
		ApproveChaincodeDefinitionForMyOrg: 'ApproveChaincodeDefinitionForMyOrg',

		/**
		 * 	type QueryApprovedChaincodeDefinitionResult struct
			Sequence             int64                         `protobuf:"varint,1,opt,name=sequence,proto3" json:"sequence,omitempty"`
			Version              string                        `protobuf:"bytes,2,opt,name=version,proto3" json:"version,omitempty"`
			EndorsementPlugin    string                        `protobuf:"bytes,3,opt,name=endorsement_plugin,json=endorsementPlugin,proto3" json:"endorsement_plugin,omitempty"`
			ValidationPlugin     string                        `protobuf:"bytes,4,opt,name=validation_plugin,json=validationPlugin,proto3" json:"validation_plugin,omitempty"`
			ValidationParameter  []byte                        `protobuf:"bytes,5,opt,name=validation_parameter,json=validationParameter,proto3" json:"validation_parameter,omitempty"`
			Collections          *peer.CollectionConfigPackage `protobuf:"bytes,6,opt,name=collections,proto3" json:"collections,omitempty"`
			InitRequired         bool                          `protobuf:"varint,7,opt,name=init_required,json=initRequired,proto3" json:"init_required,omitempty"`
			Source               *ChaincodeSource              `protobuf:"bytes,8,opt,name=source,proto3" json:"source,omitempty"`
		 */
		// used to query a approved chaincode definition for the user's own org
		QueryApprovedChaincodeDefinition: 'QueryApprovedChaincodeDefinition', // TODO args and result proto message definition not found

		// used to check a specified chaincode definition is ready to be committed. It returns the approval status for a given definition over a given set of orgs
		CheckCommitReadiness: 'CheckCommitReadiness',

		// used to 'commit' (previously 'instantiate') a chaincode in a channel.
		CommitChaincodeDefinition: 'CommitChaincodeDefinition',

		// used to query a committed chaincode definition in a channel.
		QueryChaincodeDefinition: 'QueryChaincodeDefinition',

		// used to query the committed chaincode definitions in a channel.
		QueryChaincodeDefinitions: 'QueryChaincodeDefinitions',

	}
};

/**
 *
 * @enum {string}
 */
const SystemChaincodeID = {
	LSCC: 'lscc',
	QSCC: 'qscc',
	CSCC: 'cscc',
	ESCC: 'escc',
	VSCC: 'vscc',
	LifeCycle: '_lifecycle'
};
// TODO life cycle migration
const ChaincodeExists = (channelName, chaincodeId) => {
	return {
		chaincodeId: SystemChaincodeID.LSCC,
		fcn: SystemChaincodeFunctions.lscc.getid,
		args: [channelName, chaincodeId]
	};
};
// TODO life cycle migration
const GetChaincodeData = (channelName, chaincodeId) => {
	return {
		chaincodeId: SystemChaincodeID.LSCC,
		fcn: SystemChaincodeFunctions.lscc.getccdata,
		args: [channelName, chaincodeId]
	};
};
// TODO life cycle migration
const GetDeploymentSpec = (channelName, chaincodeId) => {
	return {
		chaincodeId: SystemChaincodeID.LSCC,
		fcn: SystemChaincodeFunctions.lscc.getdepspec,
		args: [channelName, chaincodeId]
	};
};


module.exports = {
	SystemChaincodeFunctions,
	SystemChaincodeID,
};


