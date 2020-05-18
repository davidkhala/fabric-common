const Proposal = require('./proposal');
const {SystemChaincodeID: {LifeCycle}, SystemChaincodeFunctions: {_lifecycle: {InstallChaincode}}} = require('khala-fabric-formatter/systemChaincode');
const fabprotos = require('fabric-protos');
const lifeCycleProtos = fabprotos.lifecycle;
const fs = require('fs');

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
		return await this.send(buildProposalRequest);
	}
}

module.exports = LifeCycleProposal;


