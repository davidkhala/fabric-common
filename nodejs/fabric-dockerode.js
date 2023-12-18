import * as peerUtil from './peer.js';

import * as ordererUtil from './orderer.js';
import * as couchdbUtil from './couchdb.js';
import {adminName as defaultAdminName, adminPwd as defaultAdminPwd} from 'khala-fabric-formatter/user.js';

export class FabricDockerode {
	constructor(containerManager, ContainerOptsBuilder) {
		Object.assign(this, {containerManager, ContainerOptsBuilder});

	}

	/**
	 * @param [fabricTag]
	 * @param [caTag]
	 * @param {ChaincodeType} [chaincodeType]
	 */
	async fabricImagePull({fabricTag, caTag = fabricTag, chaincodeType = 'golang'}) {
		const {containerManager} = this;
		if (fabricTag) {
			const imageTag = fabricTag;
			switch (chaincodeType) {
				case 'java':
					await containerManager.imagePullIfNotExist(`hyperledger/fabric-javaenv:${imageTag}`);
					break;
				default:
					await containerManager.imagePullIfNotExist(`hyperledger/fabric-ccenv:${imageTag}`);
			}
			await containerManager.imagePullIfNotExist(`hyperledger/fabric-orderer:${imageTag}`);
			await containerManager.imagePullIfNotExist(`hyperledger/fabric-peer:${imageTag}`);
		}
		if (caTag) {
			await containerManager.imagePullIfNotExist(`hyperledger/fabric-ca:${caTag}`);
		}
		await containerManager.imagePullIfNotExist('couchdb:3.3.2');
	}

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
	async runCA({container_name, port, network, imageTag, adminName, adminPassword, TLS, issuer}, intermediate) {
		const {containerManager, ContainerOptsBuilder} = this;
		if (!adminName) {
			adminName = defaultAdminName;
		}
		if (!adminPassword) {
			adminPassword = defaultAdminPwd;
		}

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
		const Cmd = ['sh', '-c', `fabric-ca-server start ${cmdAppend} ${allowDelete}`];


		const builder = new ContainerOptsBuilder(`hyperledger/fabric-ca:${imageTag}`, Cmd);
		builder.name = container_name;
		builder.setPortBind(`${port}:7054`);

		builder.setNetwork('bridge'); // FIXME

		return await containerManager.containerStart(builder.opts);
	}

	/**
	 * queryInstalled would not change after file removal, restart to update
	 * @param {string} container_name peer container name
	 * @param {string} chaincodePackageId
	 */
	async uninstallChaincode(container_name, chaincodePackageId) {
		const {containerManager} = this;
		const Cmd = ['rm', `${peerUtil.container.state}/lifecycle/chaincodes/${chaincodePackageId.replace(':', '.')}.tar.gz`];
		await containerManager.containerExec({container_name, Cmd});
		await containerManager.containerRestart(container_name);
	}

	async chaincodeImageList() {
		const {containerManager} = this;
		const images = await containerManager.imageList();
		return images.filter(image => {
			// RepoTags can be null
			if (!image.RepoTags) {
				return false;
			}
			return image.RepoTags.find(name => name.startsWith('dev-'));
		});
	}

	async chaincodeContainerList() {
		const {containerManager} = this;
		const containers = await containerManager.containerList();
		return containers.filter(container => container.Names.find(name => name.startsWith('/dev-')));
	}

	async chaincodeImageClear(filter) {
		const {containerManager} = this;
		let images = await this.chaincodeImageList();
		if (typeof filter === 'function') {
			images = images.filter(filter);
		}
		for (const image of images) {
			await containerManager.imageDelete(image.Id);
		}
	}

	/**
	 *
	 * @param [filter]
	 * @return {Promise<void>}
	 */
	async chaincodeClear(filter) {
		const {containerManager} = this;
		let containers = await this.chaincodeContainerList();
		if (typeof filter === 'function') {
			containers = containers.filter(filter);
		}
		for (const container of containers) {
			await containerManager.containerDelete(container.Id);
			await containerManager.imageDelete(container.Image);
		}
	}

	async runOrderer(opts, operations, metrics) {
		const {containerManager, ContainerOptsBuilder} = this;
		const {
			container_name, imageTag, port, network, msp,
			ordererType, tls, stateVolume, raft_tls, loggingLevel,
		} = opts;
		const {id, configPath, volumeName} = msp;
		const Image = `hyperledger/fabric-orderer:${imageTag}`;
		raft_tls.host = container_name;
		const {admin_tls, portAdmin} = opts;
		const Env = ordererUtil.envBuilder({
			msp: {
				configPath, id
			}, ordererType, tls, raft_tls, admin_tls
		}, loggingLevel, operations, metrics);

		const builder = new ContainerOptsBuilder(Image, ['orderer']);
		builder.name = container_name;
		builder.env = Env;
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
		return await containerManager.containerStart(builder.opts);
	}

	async runPeer(opts, operations, metrics) {
		const {containerManager, ContainerOptsBuilder} = this;
		const {
			container_name, port, network, imageTag, loggingLevel,
			msp: {
				id, volumeName,
				configPath
			},
			peerHostName, tls, couchDB, stateVolume, chaincodeOpts,
		} = opts;
		const Image = `hyperledger/fabric-peer:${imageTag}`;
		const Cmd = ['peer', 'node', 'start'];
		const Env = peerUtil.envBuilder({
			network, msp: {
				configPath, id, peerHostName
			}, tls, couchDB
		}, loggingLevel, operations, metrics, chaincodeOpts);

		const builder = new ContainerOptsBuilder(Image, Cmd);
		builder.name = container_name;
		builder.env = Env;
		builder.setVolume(volumeName, peerUtil.container.MSPROOT);
		if (!chaincodeOpts || !chaincodeOpts.dockerPort) {
			builder.setVolume(peerUtil.host.dockerSock, peerUtil.container.dockerSock);
		} else {
			builder.setHostGateway();
		}

		builder.setPortBind(`${port}:7051`).setNetwork(network, [peerHostName]);

		if (operations) {
			builder.setPortBind(`${operations.port}:9443`);
		}
		if (stateVolume) {
			builder.setVolume(stateVolume, peerUtil.container.state);
		}

		return await containerManager.containerStart(builder.opts);
	}

	async runCouchDB({container_name, port, network, user = 'admin', password = 'adminpw'}) {
		const {containerManager, ContainerOptsBuilder} = this;
		const Image = 'couchdb:3.3.2';
		const Env = couchdbUtil.envBuilder(user, password);
		const builder = new ContainerOptsBuilder(Image);
		builder.name = container_name
		builder.env = Env
		builder.setNetwork(network, [container_name]);

		if (port) {
			builder.setPortBind(`${port}:5984`);
		}
		return await containerManager.containerStart(builder.opts);
	}
}

/**
 * @typedef Issuer
 * @property {string} CN Common Name
 * @property {string} [OU] Organization Unit
 * @property {string} [O] Organization Name
 * @property {string} [ST] State Name
 * @property {string} [C] Country
 */
