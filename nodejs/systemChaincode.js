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
	}
};
exports.systemChaincodes = systemChaincodes;
exports.getActionSet = (systemChaincode) => {
	return Object.keys(systemChaincodes[systemChaincode]).concat(Object.values(systemChaincodes[systemChaincode])).filter(e => e);
};
