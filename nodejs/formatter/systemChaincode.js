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

		// QueryInstalledChaincodeFuncName is the chaincode function name used to query an installed chaincode
		QueryInstalledChaincode: 'QueryInstalledChaincode',

		// QueryInstalledChaincodesFuncName is the chaincode function name used to query all installed chaincodes
		QueryInstalledChaincodes: 'QueryInstalledChaincodes',

		// used to approve a chaincode definition for execution by the user's own org
		ApproveChaincodeDefinitionForMyOrg: 'ApproveChaincodeDefinitionForMyOrg',

		// used to query a approved chaincode definition for the user's own org
		QueryApprovedChaincodeDefinition: 'QueryApprovedChaincodeDefinition',

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


