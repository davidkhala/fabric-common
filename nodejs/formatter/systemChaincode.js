const systemChaincodes = {
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
	qscc: {},
	cscc: {},
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
};
exports.SystemChaincodeID = SystemChaincodeID;


exports.ChaincodeExists = (channelName, chaincodeId) => {
	return {chaincodeId: 'lscc', fcn: 'ChaincodeExists', args: [channelName, chaincodeId]};
};
exports.GetChaincodeData = (channelName, chaincodeId) => {
	return {chaincodeId: 'lscc', fcn: 'GetChaincodeData', args: [channelName, chaincodeId]};
};
exports.GetDeploymentSpec = (channelName, chaincodeId) => {
	return {chaincodeId: 'lscc', fcn: 'GetDeploymentSpec', args: [channelName, chaincodeId]};
};