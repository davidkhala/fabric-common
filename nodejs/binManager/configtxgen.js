import path from 'path';
import BinManager, {DockerRun} from './binManager.js';
import {copy} from '@davidkhala/docker/dockerCmd.js';

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
		this.exec(`-outputBlock ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`);
	}

	genTx(outputFile) {
		const {profile, channelName, configPath} = this;
		this.exec(`-outputCreateChannelTx ${outputFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`);
	}

	viewBlock(blockFile) {
		const {profile, configPath} = this;
		return this.exec(`-inspectBlock ${blockFile} -profile ${profile} -configPath ${configPath}`);
	}

	viewChannel(channelFile) {
		const {profile, channelName, configPath} = this;
		return this.exec(`-inspectChannelCreateTx ${channelFile} -profile ${profile} -channelID ${channelName} -configPath ${configPath}`);
	}

	get executable() {
		return 'configtxgen';
	}
}

export class configtxgenV2 extends DockerRun {
	/**
	 *
	 * @param profile
	 * @param configtxYaml
	 * @param [channelName]
	 * @param containerManager
	 */
	constructor(profile, configtxYaml, channelName, containerManager) {
		super(containerManager);

		Object.assign(this, {profile, channelName, configtxYaml});
	}

	async genBlock(outputFile) {
		const {profile, channelName, configtxYaml} = this;

		copy(this.name, configtxYaml, '/tmp/configtx.yaml', true);

		const containerBlock = `/tmp/${path.basename(outputFile)}`;
		await this.exec(`-outputBlock=${containerBlock}`, `-profile=${profile}`, `-channelID=${channelName}`, '-configPath=/tmp/');
		copy(this.name, containerBlock, outputFile);
	}

	get executable() {
		return 'configtxgen';
	}
}