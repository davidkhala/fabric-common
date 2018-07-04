//TODO not ready

exports.GlobalConfig = class {
	constructor({TLS, fabricTag, thirdPartyTag, network, volumes}) {
		this.TLS = TLS;
		this.fabricTag = fabricTag;
		this.thirdPartyTag = thirdPartyTag;
		this.network = network;
		this.CONFIGTX = volumes.CONFIGTX;
		this.MSPROOT = volumes.MSPROOT;
	}
};
exports.ChannelConfig = class {
	constructor({name, file, eventWaitTime, orgs}) {
		this.name = name;
		this.file = file;
		if (Number.isInteger(eventWaitTime)) {
			this.eventWaitTime = eventWaitTime;
		}
		this.orgs = Object.keys(orgs);
	}
};
exports.OrdererGlobalConfig = class {
	constructor({consensusType, genesis_block}) {
		this.consensusType = consensusType;
		this.M = 2;
		this.N = 3;
		this.genesis_block = {
			file: genesis_block.file,
			profile: genesis_block.profile
		};
	}
};
exports.OrdererConfig = class {
	constructor({name, port}) {
		this.name = name;
		this.port = port;
	}
};

exports.KafkaConfig = class {
	constructor({name, BROKER_ID}) {
		this.name = name;
		if (!Number.isInteger(BROKER_ID)) {
			throw Error(`invalid BROKER_ID: ${BROKER_ID}`);
		}
		this.BROKER_ID = BROKER_ID;
	}
};
exports.ZookeeperConfig = class {
	constructor({name, MY_ID}) {
		this.name = name;
		if (!Number.isInteger(MY_ID)) {
			throw Error(`invalid MY_ID: ${MY_ID}`);
		}
		this.MY_ID = MY_ID;
	}
};

exports.OrdererOrgConfig = class {
	/**
	 *
	 * @param name
	 * @param MSP
	 * @param ca
	 * @param {OrdererConfig[]} orderers
	 */
	constructor({name, MSP, ca, orderers}) {
		this.name = name;
		this.MSP = {name: MSP.name, id: MSP.id};
		this.ca = {port: ca.port};
		this.orderers = orderers;
	}
};
exports.PeerConfig = class {
	constructor({name, port, eventHubPort, container_name}) {
		this.name = name;
		if (container_name) this.container_name = container_name;
		this.port = port;
		this.eventHubPort = eventHubPort;
	}
};
exports.PeerOrgConfig = class {
	/**
	 * @param name
	 * @param MSP
	 * @param ca
	 * @param {PeerConfig[]} peers
	 */
	constructor({name, MSP, ca, peers}) {
		this.name = name;
		this.MSP = {name: MSP.name, id: MSP.id};
		this.ca = {port: ca.port};
		this.peers = peers;
	}
};

