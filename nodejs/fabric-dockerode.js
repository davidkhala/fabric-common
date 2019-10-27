const dockerUtil = require('khala-dockerode/dockerode-util');
const {ContainerOptsBuilder} = dockerUtil;
const peerUtil = require('./peer');
const caUtil = require('./ca');
const kafkaUtil = require('./kafka');
const ordererUtil = require('./orderer');
const zookeeperUtil = require('./zookeeper');
const couchdbUtil = require('./couchdb');
const userUtil = require('./user');
const yaml = require('khala-nodeutils/yaml');

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
		await dockerUtil.imageCreateIfNotExist(`hyperledger/fabric-couchdb:${imageTag}`);
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


	const builder = new ContainerOptsBuilder(`hyperledger/fabric-ca:${imageTag}`, Cmd);
	builder.setName(container_name).setEnv(caUtil.envBuilder());
	builder.setPortBind(`${port}:7054`).setNetwork(network, [container_name]);
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
		builder.setVolume(configFile, caUtil.container.CONFIG);
	}
	const createOptions = builder.build();

	return dockerUtil.containerStart(createOptions);
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
exports.chaincodeClean = async (prune, filter) => {
	let containers = await exports.chaincodeContainerList();
	if (typeof filter === 'function') {
		containers = containers.filter(container => container.Names.find(filter));
	}
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
	                      msp: {id, configPath, volumeName}, ordererType, tls, stateVolume
                      }, operations, metrics) => {
	const Image = `hyperledger/fabric-orderer:${imageTag}`;
	const Cmd = ['orderer'];
	const Env = ordererUtil.envBuilder({
		BLOCK_FILE, msp: {
			configPath, id
		}, ordererType, tls
	}, undefined, operations, metrics);

	const builder = new ContainerOptsBuilder(Image, Cmd);
	builder.setName(container_name).setEnv(Env);
	builder.setVolume(volumeName, peerUtil.container.MSPROOT);
	builder.setVolume(CONFIGTXVolume, ordererUtil.container.CONFIGTX);
	builder.setPortBind(`${port}:7050`).setNetwork(network, [container_name]);

	if (stateVolume) {
		builder.setVolume(stateVolume, ordererUtil.container.state);
	}
	if (operations) {
		builder.setPortBind(`${operations.port}:8443`);
	}
	const createOptions = builder.build();
	return dockerUtil.containerStart(createOptions);
};

exports.runPeer = ({
	                   container_name, port, network, imageTag,
	                   msp: {
		                   id, volumeName,
		                   configPath
	                   }, peerHostName, tls, couchDB, stateVolume
                   }, operations, metrics) => {
	const Image = `hyperledger/fabric-peer:${imageTag}`;
	const Cmd = ['peer', 'node', 'start'];
	const Env = peerUtil.envBuilder({
		network, msp: {
			configPath, id, peerHostName
		}, tls, couchDB
	}, undefined, operations, metrics);

	const builder = new ContainerOptsBuilder(Image, Cmd);
	builder.setName(container_name).setEnv(Env);
	builder.setVolume(volumeName, peerUtil.container.MSPROOT);
	builder.setVolume(peerUtil.host.dockerSock, peerUtil.container.dockerSock);
	builder.setPortBind(`${port}:7051`).setNetwork(network, [peerHostName]);
	if (operations) {
		builder.setPortBind(`${operations.port}:9443`);
	}
	if (stateVolume) {
		builder.setVolume(stateVolume, peerUtil.container.state);
	}
	const createOptions = builder.build();
	return dockerUtil.containerStart(createOptions);
};

exports.runCouchDB = async ({imageTag, container_name, port, network, user, password}) => {
	const Image = `hyperledger/fabric-couchdb:${imageTag}`;
	const Env = couchdbUtil.envBuilder(user, password);
	const builder = new ContainerOptsBuilder(Image);
	builder.setName(container_name).setEnv(Env);
	builder.setNetwork(network, [container_name]);

	if (port) {
		builder.setPortBind(`${port}:5984`);
	}
	const createOptions = builder.build();
	return dockerUtil.containerStart(createOptions);
};
