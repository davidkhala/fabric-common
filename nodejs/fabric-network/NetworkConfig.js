/**
 * @callback GetPeersCallback
 * @param {OrgName} name
 * @return {Client.Peer[]}
 */

const Organization = class {

	/**
	 *
	 * @param {OrgName} name
	 * @param {GetPeersCallback} getPeersCallback
	 */
	constructor(name, getPeersCallback) {
		this.name = name;
		this.getPeersCallback = getPeersCallback;
	}

	getPeers() {
		return this.getPeersCallback(this.name);
	}
};

/**
 * NetworkConfig: another implementation
 * Aim to resolve problem: using discovery service by fabric-network
 */
class NetworkConfig {

	/**
	 *
	 * @param {{organizations:Object}} networkConfig
	 * @param {GetPeersCallback} getPeersCallback
	 */
	constructor(networkConfig, getPeersCallback) {
		this.organizationConfigs = networkConfig.organizations;
		this.getPeersCallback = getPeersCallback;
	}

	getOrganizationByMspId(mspid) {
		for (const [orgName, organization_config] of Object.entries(this.organizationConfigs)) {
			if (organization_config.mspid === mspid) {
				return new Organization(orgName, this.getPeersCallback);
			}
		}
	}

}



module.exports = {
	NetworkConfig
};