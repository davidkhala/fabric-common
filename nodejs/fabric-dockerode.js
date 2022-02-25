import DockerManager from '@davidkhala/dockerode/docker.js';
import ContainerOptsBuilder from '@davidkhala/dockerode/containerOptsBuilder.js';
import * as peerUtil from './peer.js';
import {container as caContainer} from './ca.js';
import * as ordererUtil from './orderer.js';
import * as couchdbUtil from './couchdb.js';
import {adminName as defaultAdminName, adminPwd as defaultAdminPwd} from 'khala-fabric-formatter/user.js';

const dockerManager = new DockerManager();

/**
 * @param [fabricTag]
 * @param [caTag]
 * @param {ChaincodeType} [chaincodeType]
 */
export const fabricImagePull = async ({fabricTag, caTag = fabricTag, chaincodeType = 'golang'}) => {
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
export const runCA = async ({container_name, port, network, imageTag, adminName, adminPassword, TLS, issuer}, intermediate) => {
	if (!adminName) {
		adminName = defaultAdminName;
	}
	if (!adminPassword) {
		adminPassword = defaultAdminPwd;
	}

	const {caKey, caCert} = caContainer;
	if (!issuer) {
		issuer = {};
	}
	const {CN, hosts} = issuer;

	const cmdIntermediateBuilder = (options) => {
		if (!options) {
			return '';
		} else {
			const {enrollmentID, enrollmentSecret, host: parentHost, port: parentPort} = options;
			return ` -u ${TLS ? 'https' : 'http'}://${enrollmentID}:${enrollmentSecret}@${parentHost}:${parentPort}`;
		}
	};


	let cmdAppend = `-d -b ${adminName}:${adminPassword} ${TLS ? '--tls.enabled' : ''} --cors.enabled ${cmdIntermediateBuilder(intermediate)}`;
	if (CN) {
		cmdAppend += ` --csr.cn=${CN}`;
	}
	if (hosts) {
		cmdAppend += ` --csr.hosts=${hosts.toString()}`;
	}
	const allowDelete = '--cfg.affiliations.allowremove --cfg.identities.allowremove';
	const Cmd = ['sh', '-c', `rm ${caKey}; rm ${caCert};fabric-ca-server start ${cmdAppend} ${allowDelete}`];


	const builder = new ContainerOptsBuilder(`hyperledger/fabric-ca:${imageTag}`, Cmd);
	builder.setName(container_name);
	builder.setPortBind(`${port}:7054`).setNetwork(network, [container_name]);
	const createOptions = builder.build();

	return await dockerManager.containerStart(createOptions);
};

/**
 * queryInstalled would not change after removal r file, restart to update
 * @param {string} container_name peer container name
 * @param {string} chaincodePackageId
 */
export const uninstallChaincode = async (container_name, chaincodePackageId) => {
	const Cmd = ['rm', `${peerUtil.container.state}/lifecycle/chaincodes/${chaincodePackageId.replace(':', '.')}.tar.gz`];
	await dockerManager.containerExec({container_name, Cmd});
	await dockerManager.containerRestart(container_name);
};
export const chaincodeImageList = async () => {
	const images = await dockerManager.imageList();
	return images.filter(image => {
		// RepoTags can be null
		if (!image.RepoTags) {
			return false;
		}
		return image.RepoTags.find(name => name.startsWith('dev-'));
	});
};
export const chaincodeContainerList = async () => {
	const containers = await dockerManager.containerList();
	return containers.filter(container => container.Names.find(name => name.startsWith('/dev-')));
};
export const chaincodeImageClear = async (filter) => {
	let images = await chaincodeImageList();
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
export const chaincodeClear = async (filter) => {
	let containers = await chaincodeContainerList();
	if (typeof filter === 'function') {
		containers = containers.filter(filter);
	}
	for (const container of containers) {
		await dockerManager.containerDelete(container.Id);
		await dockerManager.imageDelete(container.Image);
	}
};
export const runOrderer = async (opts, operations, metrics) => {
	const {container_name, imageTag, port, network, msp, ordererType, tls, stateVolume, raft_tls} = opts;
	const {id, configPath, volumeName} = msp;
	const Image = `hyperledger/fabric-orderer:${imageTag}`;
	raft_tls.host = container_name;
	const {admin_tls, portAdmin} = opts;
	const Env = ordererUtil.envBuilder({
		msp: {
			configPath, id
		}, ordererType, tls, raft_tls, admin_tls
	}, undefined, operations, metrics);

	const builder = new ContainerOptsBuilder(Image, ['orderer']);
	builder.setName(container_name).setEnv(Env);
	builder.setVolume(volumeName, peerUtil.container.MSPROOT);

	builder.setPortBind(`${portAdmin}:9443`);
	builder.setPortBind(`${port}:7050`);

	builder.setNetwork(network, [container_name]);

	if (stateVolume) {
		builder.setVolume(stateVolume, ordererUtil.container.state);
	}
	if (operations) {
		builder.setPortBind(`${operations.port}:8443`);
	}
	const createOptions = builder.build();
	return await dockerManager.containerStart(createOptions);
};

export const runPeer = async (opts, operations, metrics) => {
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

export const runCouchDB = async ({container_name, port, network, user = 'admin', password = 'adminpw'}) => {
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
