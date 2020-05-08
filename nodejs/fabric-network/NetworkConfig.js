const Organization = class {

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

	constructor(networkConfig, getPeersCallback) {
		this.organizationConfigs = networkConfig.organizations;
		this.getPeersCallback = getPeersCallback;
	}

	getOrganizationByMspId(mspId) {
		for (const [orgName, organization_config] of Object.entries(this.organizationConfigs)) {
			if (organization_config.mspid === mspId) {
				return new Organization(orgName, this.getPeersCallback);
			}
		}
	}

}


module.exports = {
	NetworkConfig
};