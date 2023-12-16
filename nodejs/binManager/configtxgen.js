import path from 'path';
import {execSync} from '@davidkhala/light/devOps.js';
import BinManager from './binManager.js';

export default class configtxgen extends BinManager {
	/**
	 *
	 * @param profile
	 * @param configtxYaml
	 * @param [channelName]
	 * @param [binPath]
	 * @param [logger]
	 */
	constructor(profile, configtxYaml, channelName, binPath, logger) {
		super(binPath, logger);
		this.configPath = path.dirname(configtxYaml);
		Object.assign(this, {profile, channelName});
	}

	genBlock(outputFile) {
		const {profile, channelName, configPath} = this;
		const CMD = this._buildCMD(`-outputBlock ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		this.logger.info(result);
	}

	genTx(outputFile) {
		const {profile, channelName, configPath} = this;
		const CMD = this._buildCMD(`-outputCreateChannelTx ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		this.logger.info(result);
	}

	viewBlock(blockFile) {
		const {profile, configPath} = this;
		const CMD = this._buildCMD(`-inspectBlock ${blockFile} -profile ${profile} -configPath ${configPath}`);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		return JSON.parse(result);
	}

	viewChannel(channelFile) {
		const {profile, channelName, configPath} = this;
		const CMD = this._buildCMD(`-inspectChannelCreateTx ${channelFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		return JSON.parse(result);
	}

	get executable() {
		return 'configtxgen';
	}
}