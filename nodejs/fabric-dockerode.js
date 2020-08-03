const DockerManager = require('khala-dockerode/docker');
const dockerManager = new DockerManager();
const ContainerOptsBuilder = require('khala-dockerode/containerOptsBuilder');
const peerUtil = require('./peer');
const caUtil = require('./ca');
const ordererUtil = require('./orderer');
const couchdbUtil = require('./couchdb');
const {adminName: defaultAdminName, adminPwd: defaultAdminPwd} = require('khala-fabric-formatter/user');
/**
 * @param [fabricTag]
 * @param [caTag]
 * @param {ChaincodeType} [chaincodeType]
 */
exports.fabricImagePull = async ({fabricTag, caTag = fabricTag, chaincodeType = 'golang'}) => {
	if (fabricTag) {
		const imageTag = fabricTag;
		switch (chaincodeType) {
			case 'java':
				await dockerManager.imageCreateIfNotExist(`hyperledger/fabric-javaenv:${imageTag}`);
				break;
			default:
				await dockerManager.imageCreateIfNotExist(`hyperledger/fabric-ccenv:${imageTag}`);
		}
		await dockerManager.imageCreateIfNotExist(`hyperledger/fabric-orderer:${imageTag}`);
		await dockerManager.imageCreateIfNotExist(`hyperledger/fabric-peer:${imageTag}`);
	}
	if (caTag) {
		await dockerManager.imageCreateIfNotExist(`hyperledger/fabric-ca:${caTag}`);
	}
	await dockerManager.imageCreateIfNotExist('couchdb:3.1');
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
exports.runCA = async ({container_name, port, network, imageTag, adminName, adminPassword, TLS, issuer}, intermediate) => {
	if (!adminName) {
		adminName = defaultAdminName;
	}
	if (!adminPassword) {
		adminPassword = defaultAdminPwd;
	}

	const {caKey, caCert} = caUtil.container;
	// eslint-disable-next-line no-unused-vars
	const {CN, OU, O, ST, C, L} = issuer; // TODO make use of full Subject DN

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

	return await dockerManager.containerStart(createOptions);
};

/**
 * TODO queryInstalled would not change even after removal
 * @param {string} container_name peer container name
 * @param {string} chaincodePackageId
 */
exports.uninstallChaincode = async (container_name, chaincodePackageId) => {
	const Cmd = ['rm', `${peerUtil.container.state}/lifecycle/chaincodes/${chaincodePackageId.replace(':', '.')}.tar.gz`];
	await dockerManager.containerExec({container_name, Cmd});
	await dockerManager.containerRestart(container_name);
};
exports.chaincodeImageList = async () => {
	const images = await dockerManager.imageList();
	return images.filter(image => {
		// RepoTags can be null
		if (!image.RepoTags) {
			return false;
		}
		return image.RepoTags.find(name => name.startsWith('dev-'));
	});
};
exports.chaincodeContainerList = async () => {
	const containers = await dockerManager.containerList();
	return containers.filter(container => container.Names.find(name => name.startsWith('/dev-')));
};
exports.chaincodeImageClear = async (filter) => {
	let images = await exports.chaincodeImageList();
	if (typeof filter === 'function') {
		images = images.filter(filter);
	}
	for (const image of images) {
		await dockerManager.imageDelete(image.Id);
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
		await dockerManager.containerDelete(container.Id);
		await dockerManager.imageDelete(container.Image);
	}
};
exports.runOrderer = async (opts, operations, metrics) => {
	const {container_name, imageTag, port, network, BLOCK_FILE, CONFIGTXVolume, msp, ordererType, tls, stateVolume, raft_tls} = opts;
	const {id, configPath, volumeName} = msp;
	const Image = `hyperledger/fabric-orderer:${imageTag}`;
	const Cmd = ['orderer'];
	raft_tls.host = container_name;
	const Env = ordererUtil.envBuilder({
		BLOCK_FILE, msp: {
			configPath, id
		}, ordererType, tls, raft_tls,
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
	return await dockerManager.containerStart(createOptions);
};

exports.runPeer = async (opts, operations, metrics) => {
	const {
		container_name, port, network, imageTag,
		msp: {
			id, volumeName,
			configPath
		}, peerHostName, tls, couchDB, stateVolume
	} = opts;
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
	return await dockerManager.containerStart(createOptions);
};

exports.runCouchDB = async ({container_name, port, network, user = 'admin', password = 'adminpw'}) => {
	const Image = 'couchdb:3.1';
	const Env = couchdbUtil.envBuilder(user, password);
	const builder = new ContainerOptsBuilder(Image);
	builder.setName(container_name).setEnv(Env);
	builder.setNetwork(network, [container_name]);

	if (port) {
		builder.setPortBind(`${port}:5984`);
	}
	const createOptions = builder.build();
	return await dockerManager.containerStart(createOptions);
};
