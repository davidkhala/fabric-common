const LifeCycleProposal = require('khala-fabric-admin/lifecycleProposal');
const {getIdentityContext} = require('khala-fabric-admin/user');

class ChaincodeAction {
	constructor(peers, user, channelName) {
		this.channel = channelName;
		this.identityContext = getIdentityContext(user);
		this.endorsers = peers.map(({endorser}) => endorser);
	}

	async install(chaincodePackagePath) {
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, '', this.endorsers);

		const result = await lifeCycleProposal.installChaincode(chaincodePackagePath);
		return result;
	}

	async approve({name, version, PackageID, sequence}, orderer) {

		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const validation_parameter = undefined; // TODO WIP
		const result = await lifeCycleProposal.approveForMyOrg({
			name,
			version,
			validation_parameter,
			sequence,
		}, PackageID);
		// FIXME implicit policy evaluation failed - 1 sub-policies were satisfied, but this policy requires 2 of the 'Endorsement' sub-policies to be satisfied
		const commitResult = await lifeCycleProposal.commit([orderer.committer], 3000);
		return result;
	}

	async checkCommitReadiness({name, version, sequence}) {
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.checkCommitReadiness({name, version, sequence});
		return result;

	}

	async commitChaincodeDefinition({name, version, sequence}, orderer) {
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.commitChaincodeDefinition({name, version, sequence});
		const commitResult = await lifeCycleProposal.commit([orderer.committer], 3000);
		return result;
	}

	async queryChaincodeDefinition(name) {
		const lifeCycleProposal = new LifeCycleProposal(this.identityContext, this.channel, this.endorsers);
		const result = await lifeCycleProposal.queryChaincodeDefinition(name);
		return result;
	}
}

module.exports = ChaincodeAction;



