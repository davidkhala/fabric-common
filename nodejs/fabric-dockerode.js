const dockerUtil = require('khala-dockerode/dockerode-util');
const {ContainerOptsBuilder} = dockerUtil;
const peerUtil = require('./peer');
const caUtil = require('./ca');
const kafkaUtil = require('./kafka');
const ordererUtil = require('./orderer');
const zookeeperUtil = require('./zookeeper');
const couchdbUtil = require('./couchdb');
const userUtil = require('./user');
const query = require('./query');
/**
 * @param fabricTag
 * @param thirdPartyTag
 * @param {ChaincodeType} [chaincodeType]
 */
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
 * @typedef Issuer
 * @property {string} CN Common Name
 * @property {string} [OU] Organization Unit
 * @property {string} [O] Organization Name
 * @property {string} [ST] State Name
 * @property {string} [C] Country
 */

/**
 * TLS enabled but no certificate or key provided, automatically generate TLS credentials
 * @param {string} container_name
 * @param {Number} port exposed host port
 * @param {string} network
 * @param {string} imageTag
 * @param {string} [adminName] admin user name
 * @param {string} [adminPassword] admin user password
 * @param {boolean} TLS
 * @param {Issuer} issuer
 * @param intermediate
 * @returns {Promise<*>}
 */
exports.runCA = async ({
	container_name, port, network, imageTag,
	adminName = userUtil.adminName, adminPassword = userUtil.adminPwd,
	TLS, issuer
}, intermediate) => {

	const {caKey, caCert} = caUtil.container;
	const {CN, OU, O, ST, C, L} = issuer;

	const cmdIntermediateBuilder = (options) => {
		if (!options) {
			return '';
		} else {
			const {enrollmentID, enrollmentSecret, host: parentHost, port: parentPort} = options;
			return ` -u ${TLS ? 'https' : 'http'}://${enrollmentID}:${enrollmentSecret}@${parentHost}:${parentPort}`;
		}
	};


	const cmdAppend = `-d -b ${adminName}:${adminPassword} ${TLS ? '--tls.enabled' : ''} --csr.cn=${CN} --cors.enabled${cmdIntermediateBuilder(intermediate)}`;
	const Cmd = ['sh', '-c', `rm ${caKey}; rm ${caCert};fabric-ca-server start ${cmdAppend}`];


	const builder = new ContainerOptsBuilder(`hyperledger/fabric-ca:${imageTag}`, Cmd);
	builder.setName(container_name).setEnv(caUtil.envBuilder());
	builder.setPortBind(`${port}:7054`).setNetwork(network, [container_name]);
	const createOptions = builder.build();

	return await dockerUtil.containerStart(createOptions);
};


exports.runKafka = async ({container_name, network, imageTag, BROKER_ID}, zookeepers, {N, M}) => {

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
	return await dockerUtil.containerStart(createOptions);
};
exports.runZookeeper = async ({container_name, network, imageTag, MY_ID}, zookeepersConfig) => {
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
	return await dockerUtil.containerStart(createOptions);
};
/**
 * docker exec $PEER_CONTAINER rm -rf /var/hyperledger/production/chaincodes/$CHAINCODE_NAME.$VERSION
 * @param [peer] required if use sync fashion
 * @param [client] required if use sync fashion
 * @param {string} container_name peer container name
 * @param {string} chaincodeId
 * @param {string} chaincodeVersion
 * @param [logger]
 * @return {Promise<void>}
 */
exports.uninstallChaincode = async ({container_name, chaincodeId, chaincodeVersion, peer, client}, logger = console) => {
	const Cmd = ['rm', '-rf', `${peerUtil.container.state}/chaincodes/${chaincodeId}.${chaincodeVersion}`];
	await dockerUtil.containerExec({container_name, Cmd});
	if (peer && client) {
		const loop = async () => {
			const {pretty} = await query.chaincodesInstalled(peer, client);
			if (pretty.find(({name, version}) => name === chaincodeId && version === chaincodeVersion)) {
				logger.debug('uninstallChaincode', 'docekr exec lagging, retry...');
				await loop();
			}
		};
		await loop();
	}

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
exports.chaincodeImageClear = async (filter) => {
	let images = await exports.chaincodeImageList();
	if (typeof filter === 'function') {
		images = images.filter(filter);
	}
	for (const image of images) {
		await dockerUtil.imageDelete(image.Id);
	}
};
/**
 *
 * @param [filter]
 * @return {Promise<void>}
 */
exports.chaincodeClear = async (filter) => {
	let containers = await exports.chaincodeContainerList();
	if (typeof filter === 'function') {
		containers = containers.filter(filter);
	}
	for (const container of containers) {
		await dockerUtil.containerDelete(container.Id);
		await dockerUtil.imageDelete(container.Image);
	}
};
exports.runOrderer = async ({
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
	return await dockerUtil.containerStart(createOptions);
};

exports.runPeer = async ({
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
	return await dockerUtil.containerStart(createOptions);
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
	return await dockerUtil.containerStart(createOptions);
};
