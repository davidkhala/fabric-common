const dockerUtil = require('../docker/nodejs/dockerode-util');
const dockerCmdUtil = require('../docker/nodejs/dockerCmd');
const logger = require('./logger').new('dockerode');
const peerUtil = require('./peer');
const caUtil = require('./ca');
const kafkaUtil = require('./kafka');
const ordererUtil = require('./orderer');
const zookeeperUtil = require('./zookeeper');

exports.imagePullCCENV = (imageTag) => {
	return dockerUtil.imagePull(`hyperledger/fabric-ccenv:${imageTag}`);
};
exports.runCA = ({
					 container_name, port, network, imageTag, admin = 'Admin', adminpw = 'passwd'
				 }) => {
	const createOptions = {
		name: container_name,
		Env: caUtil.envBuilder(),
		ExposedPorts: {
			'7054': {}
		},
		Cmd: ['fabric-ca-server', 'start', '-d', '-b', `${admin}:${adminpw}`],
		Image: `hyperledger/fabric-ca:${imageTag}`,
		Hostconfig: {
			PortBindings: {
				'7054': [
					{
						HostPort: port.toString()
					}
				]
			},
		},
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		}
	};
	return dockerUtil.containerStart(createOptions);
};
exports.deployZookeeper = ({Name, network, imageTag, Constraints, MY_ID}, zookeepersConfig) => {
	return dockerUtil.serviceCreateIfNotExist({
		Image: `hyperledger/fabric-zookeeper:${imageTag}`,
		Name,
		network,
		Constraints,
		ports: [{container: 2888}, {container: 3888}, {container: 2181}],
		Env: zookeeperUtil.envBuilder(MY_ID, zookeepersConfig,true),
	});
};
exports.deployKafka = ({Name, network, imageTag, Constraints, BROKER_ID}, zookeepers, {N, M}) => {
	return dockerUtil.serviceCreateIfNotExist({
		Name,
		Image: `hyperledger/fabric-kafka:${imageTag}`,
		network,
		Constraints,
		ports: [{container: 9092}],
		Env: kafkaUtil.envBuilder({N, M, BROKER_ID}, zookeepers),
	});
};

exports.deployCA = ({Name, network, imageTag, Constraints, port, admin = 'Admin', adminpw = 'passwd'}) => {
	const serviceName = dockerUtil.swarmServiceName(Name);
	return dockerUtil.serviceCreateIfNotExist({
		Image: `hyperledger/fabric-ca:${imageTag}`,
		Name: serviceName,
		Cmd: ['fabric-ca-server', 'start', '-d', '-b', `${admin}:${adminpw}`],
		network,
		Constraints,
		ports: [{host: port, container: 7054}],
		Env: caUtil.envBuilder(),
		Aliases: [Name],
	});
};
exports.runKafka = ({container_name, network, imageTag, BROKER_ID}, zookeepers, {N, M}) => {

	const createOptions = {
		name: container_name,
		Env: kafkaUtil.envBuilder({N, M, BROKER_ID}, zookeepers),
		Image: `hyperledger/fabric-kafka:${imageTag}`,
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		},
		Hostconfig: {
			PublishAllPorts:true
		},
	};
	return dockerUtil.containerStart(createOptions);
};
exports.runZookeeper = ({container_name, network, imageTag, MY_ID}, zookeepersConfig) => {
	const createOptions = {
		name: container_name,
		Env: zookeeperUtil.envBuilder(MY_ID, zookeepersConfig),
		Image: `hyperledger/fabric-zookeeper:${imageTag}`,
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		},
		Hostconfig: {
			PublishAllPorts:true
		},
	};
	return dockerUtil.containerStart(createOptions);
};
exports.uninstallChaincode = ({container_name, chaincodeId, chaincodeVersion}) => {
	const Cmd = ['rm', '-rf', `/var/hyperledger/production/chaincodes/${chaincodeId}.${chaincodeVersion}`];
	return dockerUtil.containerExec({container_name, Cmd});

// 	docker exec $PEER_CONTAINER rm -rf /var/hyperledger/production/chaincodes/$CHAINCODE_NAME.$VERSION
};
exports.chaincodeImageList = async () => {
	const images = await dockerUtil.imageList();
	return images.filter(image => image.RepoTags.find(name => name.startsWith('dev-')));
};
exports.chaincodeContainerList = async () => {
	const containers = await dockerUtil.containerList();
	return containers.filter(container => container.Names.find(name => name.startsWith('/dev-')));
};
exports.chaincodeClean = async () => {
	const containers = await module.exports.chaincodeContainerList();
	await Promise.all(containers.map(container => {
		return dockerUtil.containerDelete(container.Id)
			.then(() => dockerUtil.imageDelete(container.Image));
	}));
};
exports.runOrderer = ({container_name, imageTag, port, network, BLOCK_FILE, CONFIGTXVolume, msp: {id, configPath, volumeName}, kafkas, tls}) => {
	const Image = `hyperledger/fabric-orderer:${imageTag}`;
	const Cmd = ['orderer'];
	const Env = ordererUtil.envBuilder({
		BLOCK_FILE, msp: {
			configPath, id
		}, kafkas, tls
	});

	const createOptions = {
		name: container_name,
		Env,
		Volumes: {
			[peerUtil.container.MSPROOT]: {},
			[ordererUtil.container.CONFIGTX]: {},
		},
		Cmd,
		Image,
		ExposedPorts: {
			'7050': {},
		},
		Hostconfig: {
			Binds: [
				`${volumeName}:${peerUtil.container.MSPROOT}`,
				`${CONFIGTXVolume}:${ordererUtil.container.CONFIGTX}`
			],
			PortBindings: {
				'7050': [
					{
						HostPort: port.toString()
					}
				]
			},
		},
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		}
	};
	return dockerUtil.containerStart(createOptions);
};

exports.deployOrderer = ({
							 Name, network, imageTag, Constraints, port,
							 msp: {volumeName, configPath, id}, CONFIGTXVolume, BLOCK_FILE, kafkas, tls
						 }) => {
	const serviceName = dockerUtil.swarmServiceName(Name);
	return dockerUtil.serviceCreateIfNotExist({
		Cmd: ['orderer'],
		Image: `hyperledger/fabric-orderer:${imageTag}`,
		Name: serviceName, network, Constraints,
		volumes: [{volumeName, volume: peerUtil.container.MSPROOT},
			{volumeName: CONFIGTXVolume, volume: ordererUtil.container.CONFIGTX}],
		ports: [{host: port, container: 7050}],
		Env: ordererUtil.envBuilder({BLOCK_FILE, msp: {configPath, id}, kafkas, tls}),
		Aliases: [Name]
	});
};
exports.deployPeer = ({
						  Name, network, imageTag, Constraints, port, eventHubPort,
						  msp: {volumeName, configPath, id}, peer_hostName_full, tls
					  }) => {
	const serviceName = dockerUtil.swarmServiceName(Name);

	return dockerUtil.serviceCreateIfNotExist({
		Image: `hyperledger/fabric-peer:${imageTag}`,
		Cmd: ['peer', 'node', 'start'],
		Name: serviceName, network, Constraints, volumes: [{
			volumeName, volume: peerUtil.container.MSPROOT
		}, {
			Type: 'bind', volumeName: peerUtil.host.dockerSock, volume: peerUtil.container.dockerSock
		}],
		ports: [
			{host: port, container: 7051},
			{host: eventHubPort, container: 7053}
		],
		Env: peerUtil.envBuilder({network, msp: {configPath, id, peer_hostName_full}, tls}),
		Aliases: [Name,peer_hostName_full],
	});
};
exports.runPeer = ({
					   container_name, port, eventHubPort, network, imageTag,
					   msp: {
						   id, volumeName,
						   configPath
					   }, peer_hostName_full, tls
				   }) => {
	const Image = `hyperledger/fabric-peer:${imageTag}`;
	const Cmd = ['peer', 'node', 'start'];
	const Env = peerUtil.envBuilder({
		network, msp: {
			configPath, id, peer_hostName_full
		}, tls
	});

	const createOptions = {
		name: container_name,
		Env,
		Volumes: {
			[peerUtil.container.dockerSock]: {},
			[peerUtil.container.MSPROOT]: {}
		},
		Cmd,
		Image,
		ExposedPorts: {
			'7051': {},
			'7053': {}
		},
		Hostconfig: {
			Binds: [
				`${peerUtil.host.dockerSock}:${peerUtil.container.dockerSock}`,
				`${volumeName}:${peerUtil.container.MSPROOT}`],
			PortBindings: {
				'7051': [
					{
						HostPort: port.toString()
					}
				],
				'7053': [
					{
						HostPort: eventHubPort.toString()
					}
				]
			},
		},
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [peer_hostName_full]
				}
			}
		}
	};
	return dockerUtil.containerStart(createOptions);
};

exports.volumeReCreate = async ({Name, path}) => {
	await dockerUtil.volumeRemove(Name);
	return await dockerUtil.volumeCreateIfNotExist({Name, path});
};

exports.networkReCreate = ({Name}, swarm) => {
	return dockerUtil.networkRemove(Name).then(() => dockerUtil.networkCreate({Name}, swarm));
};
