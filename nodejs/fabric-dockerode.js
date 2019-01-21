const dockerUtil = require('../docker/nodejs/dockerode-util');
const {
	constraintSelf, taskDeadWaiter, taskLiveWaiter, swarmServiceName, serviceCreateIfNotExist, swarmInit,swarmJoin,
	swarmTouch,swarmLeave,swarmBelongs,taskList,findTask
} = require('../docker/nodejs/dockerode-swarm-util');
const logger = require('./logger').new('dockerode');
const peerUtil = require('./peer');
const caUtil = require('./ca');
const kafkaUtil = require('./kafka');
const ordererUtil = require('./orderer');
const zookeeperUtil = require('./zookeeper');
const couchdbUtil = require('./couchdb');
const userUtil = require('./user');
const yaml = require('khala-nodeutils/yaml');
const dockerHelper = require('../docker/nodejs/helper');

/**
 * TODO not mature
 * @returns {Promise<void>}
 */
exports.swarmRenew = async () => {
	const {result, reason} = await swarmTouch();
	if (!result) {
		if (reason === 'consensus') {
			await swarmLeave();
			await exports.swarmIPInit();
		} else if (reason === 'noexist') {
			await exports.swarmIPInit();
		}
	}
};
exports.swarmIPJoin = async ({AdvertiseAddr, JoinToken}) => {
	const ip = dockerHelper.ip();
	await swarmJoin({AdvertiseAddr, JoinToken}, ip);
};
exports.swarmIPInit = async (AdvertiseAddr) => {
	if (!AdvertiseAddr) {
		const ip = dockerHelper.ip();
		AdvertiseAddr = `${ip}:2377`;
	}
	logger.debug('swarmIPInit', AdvertiseAddr);
	return await swarmInit({AdvertiseAddr});
};
exports.fabricImagePull = async ({fabricTag, thirdPartyTag, chaincodeType = 'golang'}) => {
	if (fabricTag) {
		const imageTag = fabricTag;
		switch (chaincodeType) {
			case 'java':
				await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-javaenv:${imageTag}`);
				break;
			default:
				await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-ccenv:${imageTag}`);
		}
		await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-orderer:${imageTag}`);
		await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-peer:${imageTag}`);
		await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-ca:${imageTag}`);
	}
	if (thirdPartyTag) {
		const imageTag = thirdPartyTag;
		await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-kafka:${imageTag}`);
		await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-zookeeper:${imageTag}`);
	}
};

/**
 * @typedef IssuerObject
 * @property {string} CN Common Name
 * @property {string} OU Organization Unit
 * @property {string} O Organization Name
 * @property {string} ST State Name
 * @property {string} C Country
 */

/**
 * TLS enabled but no certificate or key provided, automatically generate TLS credentials
 * @param container_name
 * @param {Number} port exposed host port
 * @param network
 * @param imageTag
 * @param admin
 * @param adminpw
 * @param TLS
 * @param {IssuerObject} Issuer
 * @param configFile
 * @returns {Promise<*>}
 */
exports.runCA = ({
	                 container_name, port, network, imageTag,
	                 admin = userUtil.adminName, adminpw = userUtil.adminPwd,
	                 TLS, Issuer
                 }, configFile) => {

	const {caKey, caCert} = caUtil.container;
	const {CN, OU, O, ST, C, L} = Issuer;
	const cmdAppend = configFile ? '' : `-d -b ${admin}:${adminpw} ${TLS ? '--tls.enabled' : ''} --csr.cn=${CN}`;
	const Cmd = ['sh', '-c', `rm ${caKey}; rm ${caCert};fabric-ca-server start ${cmdAppend}`];

	const createOptions = {
		name: container_name,
		Env: caUtil.envBuilder(),
		ExposedPorts: {
			'7054': {}
		},
		Cmd,
		Image: `hyperledger/fabric-ca:${imageTag}`,
		Hostconfig: {
			PortBindings: {
				'7054': [
					{
						HostPort: port.toString()
					}
				]
			}

		},
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		}
	};
	if (configFile) {
		const config = {
			debug: true,
			csr: {
				cn: CN,
				names: [{
					C,
					ST,
					L,
					O,
					OU
				}],

				hosts: [
					'localhost', container_name
				]
			},
			tls: {
				enabled: !!TLS

			},

			registry: {
				identities: [{
					name: admin,
					pass: adminpw,
					type: 'client',
					affiliation: '',
					attrs: {
						['hf.Registrar.Roles']: 'peer,orderer,client,user',
						['hf.Registrar.DelegateRoles']: 'peer,orderer,client,user',
						['hf.Revoker']: true,
						['hf.IntermediateCA']: true,
						['hf.GenCRL']: true,
						['hf.Registrar.Attributes']: '*',
						['hf.AffiliationMgr']: true
					}
				}]
			},
			signing: {
				default: {
					usage:
						[
							'digital signature'
						],
					expiry: '8760h'
				},

				profiles:
					{
						tls: {
							usage: [
								'server auth', // Extended key usage
								'client auth', // Extended key usage
								// 'signing',
								'digital signature',
								'key encipherment',
								'key agreement'
							],
							expiry: '8760h'
						}
					}
			}

		};
		yaml.write(config, configFile);

		createOptions.Volumes = {
			[caUtil.container.CONFIG]: {}
		};
		createOptions.Hostconfig.Binds = [
			`${configFile}:${caUtil.container.CONFIG}`
		];
	}
	return dockerUtil.containerStart(createOptions);
}
;
exports.deployZookeeper = async ({Name, network, imageTag, Constraints, MY_ID}, zookeepersConfig) => {
	if (!Constraints) {
		Constraints = await constraintSelf();
	}
	return serviceCreateIfNotExist({
		Image: `hyperledger/fabric-zookeeper:${imageTag}`,
		Name,
		network,
		Constraints,
		ports: [{container: 2888}, {container: 3888}, {container: 2181}],
		Env: zookeeperUtil.envBuilder(MY_ID, zookeepersConfig, true),
		Aliases: [Name]
	});
};
exports.deployKafka = async ({Name, network, imageTag, Constraints, BROKER_ID}, zookeepers, {N, M}) => {
	if (!Constraints) {
		Constraints = await constraintSelf();
	}
	return serviceCreateIfNotExist({
		Name,
		Image: `hyperledger/fabric-kafka:${imageTag}`,
		network,
		Constraints,
		ports: [{container: 9092}],
		Env: kafkaUtil.envBuilder({N, M, BROKER_ID}, zookeepers),
		Aliases: [Name]
	});
};

exports.deployCA = async ({Name, network, imageTag, Constraints, port, admin = userUtil.adminName, adminpw = userUtil.adminPwd, TLS}) => {
	const serviceName = swarmServiceName(Name);
	const tlsOptions = TLS ? '--tls.enabled' : '';

	const {caKey, caCert} = caUtil.container;

	const Cmd = ['sh', '-c', `rm ${caKey}; rm ${caCert}; fabric-ca-server start -d -b ${admin}:${adminpw} ${tlsOptions}  --csr.cn=${Name}`];
	if (!Constraints) {
		Constraints = await constraintSelf();
	}
	return await serviceCreateIfNotExist({
		Image: `hyperledger/fabric-ca:${imageTag}`,
		Name: serviceName,
		Cmd,
		network,
		Constraints,
		ports: [{host: port, container: 7054}],
		Env: caUtil.envBuilder(),
		Aliases: [Name]
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
			PublishAllPorts: true
		}
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
			PublishAllPorts: true
		}
	};
	return dockerUtil.containerStart(createOptions);
};
/**
 * TODO not sure it is possible
 */
exports.uninstallChaincode = ({container_name, chaincodeId, chaincodeVersion}) => {
	const Cmd = ['rm', '-rf', `/var/hyperledger/production/chaincodes/${chaincodeId}.${chaincodeVersion}`];
	return dockerUtil.containerExec({container_name, Cmd});

// 	docker exec $PEER_CONTAINER rm -rf /var/hyperledger/production/chaincodes/$CHAINCODE_NAME.$VERSION
};
exports.chaincodeImageList = async () => {
	const images = await dockerUtil.imageList();
	return images.filter(image => {
		// RepoTags can be null
		if (!image.RepoTags) {
			return false;
		}
		return image.RepoTags.find(name => name.startsWith('dev-'));
	});
};
exports.chaincodeContainerList = async () => {
	const containers = await dockerUtil.containerList();
	return containers.filter(container => container.Names.find(name => name.startsWith('/dev-')));
};
exports.chaincodeClean = async (prune) => {
	const containers = await exports.chaincodeContainerList();
	await Promise.all(containers.map(async (container) => {
		await dockerUtil.containerDelete(container.Id);
		await dockerUtil.imageDelete(container.Image);
	}));
	if (prune) {
		const images = await exports.chaincodeImageList();
		await Promise.all(images.map(async (image) => {
			await dockerUtil.imageDelete(image.Id);
		}));
	}
};
exports.runOrderer = ({
	                      container_name, imageTag, port, network, BLOCK_FILE, CONFIGTXVolume,
	                      msp: {id, configPath, volumeName}, kafkas, tls, stateVolume
                      }, operationPort) => {
	const Image = `hyperledger/fabric-orderer:${imageTag}`;
	const Cmd = ['orderer'];
	const Env = ordererUtil.envBuilder({
		BLOCK_FILE, msp: {
			configPath, id
		}, kafkas, tls
	}, undefined, operationPort);

	const createOptions = {
		name: container_name,
		Env,
		Volumes: {
			[peerUtil.container.MSPROOT]: {},
			[ordererUtil.container.CONFIGTX]: {}
		},
		Cmd,
		Image,
		ExposedPorts: {
			'7050': {},
			'8443': {}
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
				],
				'8443': []
			}
		},
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		}
	};
	if (stateVolume) {
		createOptions.Volumes[ordererUtil.container.state] = {};
		createOptions.Hostconfig.Binds.push(`${stateVolume}:${ordererUtil.container.state}`);
	}
	if (operationPort) {
		createOptions.Hostconfig.PortBindings['8443'].push({HostPort: operationPort.toString()});
	}
	return dockerUtil.containerStart(createOptions);
};

exports.deployOrderer = async ({
	                               Name, network, imageTag, Constraints, port,
	                               msp: {volumeName, configPath, id}, CONFIGTXVolume, BLOCK_FILE, kafkas, tls
                               }) => {
	const serviceName = swarmServiceName(Name);
	if (!Constraints) {
		Constraints = await constraintSelf();
	}

	return await serviceCreateIfNotExist({
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
exports.deployPeer = async ({
	                            Name, network, imageTag, Constraints, port,
	                            msp: {volumeName, configPath, id}, peerHostName, tls
                            }) => {
	const serviceName = swarmServiceName(Name);
	if (!Constraints) {
		Constraints = await constraintSelf();
	}
	return await serviceCreateIfNotExist({
		Image: `hyperledger/fabric-peer:${imageTag}`,
		Cmd: ['peer', 'node', 'start'],
		Name: serviceName, network, Constraints, volumes: [{
			volumeName, volume: peerUtil.container.MSPROOT
		}, {
			Type: 'bind', volumeName: peerUtil.host.dockerSock, volume: peerUtil.container.dockerSock
		}],
		ports: [
			{host: port, container: 7051}
		],
		Env: peerUtil.envBuilder({network, msp: {configPath, id, peerHostName}, tls}),
		Aliases: [Name, peerHostName]
	});
};
exports.runPeer = ({
	                   container_name, port, network, imageTag,
	                   msp: {
		                   id, volumeName,
		                   configPath
	                   }, peerHostName, tls, couchDB, stateVolume
                   }, operationPort) => {
	const Image = `hyperledger/fabric-peer:${imageTag}`;
	const Cmd = ['peer', 'node', 'start'];
	const Env = peerUtil.envBuilder({
		network, msp: {
			configPath, id, peerHostName
		}, tls, couchDB
	}, undefined, operationPort);

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
			'9443': {}
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
				'9443': []
			}
		},
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [peerHostName]
				}
			}
		}
	};
	if (operationPort) {
		createOptions.Hostconfig.PortBindings['9443'].push({HostPort: operationPort.toString()});
	}
	if (stateVolume) {
		createOptions.Volumes[peerUtil.container.state] = {};
		createOptions.Hostconfig.Binds.push(`${stateVolume}:${peerUtil.container.state}`);
	}
	return dockerUtil.containerStart(createOptions);
};

// TODO deployCouchDB
exports.runCouchDB = async ({imageTag, container_name, port, network, user, password}) => {
	const Image = `hyperledger/fabric-couchdb:${imageTag}`;
	const Env = couchdbUtil.envBuilder(user, password);
	const createOptions = {
		name: container_name,
		Env,
		Image,
		NetworkingConfig: {
			EndpointsConfig: {
				[network]: {
					Aliases: [container_name]
				}
			}
		}
	};
	if (port) {
		createOptions.ExposedPorts = {
			'5984': {}
		};
		createOptions.Hostconfig = {
			PortBindings: {
				'5984': [
					{
						HostPort: port.toString()
					}
				]
			}
		};
	}
	return dockerUtil.containerStart(createOptions);
};

/**
 * if service is deleted, taskList could not find legacy task
 * @param {Service[]} services service info array
 * @param nodes
 * @returns {Promise<any>}
 */
exports.tasksWaitUntilDead = async ({nodes, services} = {}) => {
	const ids = services.map(service => service.ID);
	const tasks = (await taskList({nodes})).filter(task => {
		const {ServiceID} = task;
		return ids.find(id => id === ServiceID);
	});

	logger.debug('tasksWaitUtilDead', tasks.length);
	for (const task of tasks) {
		await taskDeadWaiter(task);
	}
};
exports.tasksWaitUntilLive = async (services) => {
	for (const service of services) {
		await taskLiveWaiter(service);
	}
};