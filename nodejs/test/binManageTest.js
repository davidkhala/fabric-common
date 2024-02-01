import path from 'path';
import fsExtra from 'fs-extra';
import {consoleLogger} from '@davidkhala/logger/log4.js';
import {filedirname} from '@davidkhala/light/es6.mjs';
import {Server} from '../binManager/configtxlator.js';
import Configtxgen from '../binManager/configtxgen.js';

filedirname(import.meta);
const logger = consoleLogger('test:binManager');
const configtxYaml = path.resolve(__dirname, '../../config/configtx.yaml');
process.env.binPath = path.resolve(__dirname, '../../bin');
const blockProfiles = [
	'SampleDevModeEtcdRaft'
];
const channelProfiles = ['SampleSingleMSPChannel'];
fsExtra.ensureDirSync(path.resolve(__dirname, 'artifacts'));

const genBlockTest = async (blockProfile) => {
	const blockFile = path.resolve(__dirname, `artifacts/${blockProfile}.block`);
	const configtxgen = new Configtxgen(blockProfile, configtxYaml);
	await configtxgen.genBlock(blockFile);
	logger.info(`genBlock[${blockProfile}]`);
};

const viewBlockTest = async (blockProfile) => {
	const blockFile = path.resolve(__dirname, `artifacts/${blockProfile}.block`);
	const configtxgen = new Configtxgen(blockProfile, configtxYaml);
	const result = await configtxgen.viewBlock(blockFile);
	logger.info(`viewBlock[${blockProfile}]`, result);
};


describe('configtxlator', () => {
	it('configtxlatorRestart', async () => {
		const server = new Server();
		await server.start();
		await server.stop();
	});
});
describe('configtxgen', () => {

	it('blockProfiles', async () => {
		for (const profile of blockProfiles) {
			if (profile === 'SampleDevModeEtcdRaft') {
				logger.warn('skip SampleDevModeEtcdRaft due to : path/to/ClientTLSCert0: no such file or directory');
				continue;
			}
			await genBlockTest(profile);
			await viewBlockTest(profile);
		}
	});
	it('channelProfiles', async () => {
		const genChannelTest = async (channelProfile, channelName = channelProfile) => {
			const channelFile = path.resolve(__dirname, `artifacts/${channelProfile}.tx`);
			const configtxgen = new Configtxgen(channelProfile, configtxYaml, channelName);
			await configtxgen.genTx(channelFile);
			logger.info(`genChannel[${channelProfile}]`);
		};
		const viewChannelTest = async (channelProfile, channelName = channelProfile) => {
			const channelFile = path.resolve(__dirname, `artifacts/${channelProfile}.tx`);
			const configtxgen = new Configtxgen(channelProfile, configtxYaml, channelName);
			const result = await configtxgen.viewChannel(channelFile);
			logger.info(`viewChannel[${channelProfile}]`, result);
		};

		for (const profile of channelProfiles) {
			await genChannelTest(profile);
			await viewChannelTest(profile);
		}
	});
});
