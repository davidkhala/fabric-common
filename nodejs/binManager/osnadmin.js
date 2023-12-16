import {execSync} from '@davidkhala/light/devOps.js';
import BinManager from './binManager.js';

export default class osnadmin extends BinManager {
	constructor(ordererAdminAddress, {tlsCaCert, clientKey, clientCert}, binPath, logger) {
		super(binPath, logger);
		Object.assign(this, {ordererAdminAddress, tlsCaCert, clientCert, clientKey});
	}

	join(channelID, blockFile) {
		const {ordererAdminAddress, tlsCaCert, clientCert, clientKey} = this;
		const CMD = this._buildCMD('channel join', `--orderer-address=${ordererAdminAddress}`,
			`--ca-file=${tlsCaCert} --client-cert=${clientCert} --client-key=${clientKey}`,
			`--channel-id=${channelID}`,
			`--config-block=${blockFile}`,
		);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		this.logger.info(result);
	}

	list() {
		// TODO osnadmin channel list
	}

	remove() {
		// TODO osnadmin channel remove
	}

	get executable() {
		return 'osnadmin';
	}
}