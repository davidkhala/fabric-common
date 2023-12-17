import path from 'path';
import fs from 'fs';
import {isDirectory} from '@davidkhala/light/file.js';
import {OCI} from '@davidkhala/container/oci.js';
import {execSync} from '@davidkhala/light/devOps.js';
import {ContainerOptsBuilder} from '@davidkhala/docker/docker.js';

const expectedBinaries = [
	'configtxgen', 'configtxlator', 'cryptogen', 'discover', 'fabric-ca-client', 'fabric-ca-server', 'ledgerutil', 'orderer', 'osnadmin', 'peer'
];

class CMDManager {
	/**
	 * @abstract
	 */
	get executable() {
		return '';
	}

	/**
	 * @abstract
	 * @param args
	 */
	exec(...args) {
	}
}

export default class BinManager extends CMDManager {
	/**
	 *
	 * @param binPath
	 * @param [logger]
	 */
	constructor(binPath = process.env.binPath, logger = console) {
		super();
		if (!binPath) {
			throw Error('BinManager: environment <binPath> is undefined');
		}
		if (!isDirectory(binPath)) {
			throw Error('BinManager: environment <binPath> is not a directory');
		}
		const files = fs.readdirSync(binPath);

		expectedBinaries.every(value => {
			if (!files.includes(value)) {
				throw Error(`binary ${value} not found in binPath ${binPath}`);
			}
		});

		Object.assign(this, {logger, binPath});
	}

	_buildCMD(...args) {
		return `${path.resolve(this.binPath, this.executable)} ${args.join(' ')}`;
	}

	exec(...args) {
		const CMD = this._buildCMD(...args);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		this.logger.info(result);
		return result;
	}

}


export class DockerRun extends CMDManager {
	/**
	 *
	 * @param {OCI} containerManager
	 * @param [containerName]
	 */
	constructor(containerManager, containerName = 'cli') {
		super();

		this.container = containerManager;
		this.name = containerName;
	}

	async start(volumes = {}) {
		const builder = new ContainerOptsBuilder('hyperledger/fabric-tools');
		builder.setName(this.name);
		builder.setTTY(true);
		for (const [volumeName, containerPath] of Object.entries(volumes)) {
			builder.setVolume(volumeName, containerPath);
		}

		await this.container.containerStart(builder.opts);
	}

	async stop() {
		await this.container.containerDelete(this.name);
	}

	async exec(...args) {
		await this.container.containerExec(this.name, {Cmd: [this.executable, ...args]});
	}
}
