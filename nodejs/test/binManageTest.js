import path from 'path';
import BinManager from '../binManager.js';
import fsExtra from 'fs-extra';
import {consoleLogger} from '@davidkhala/logger/log4.js';
import {filedirname} from '@davidkhala/light/es6.mjs';

filedirname(import.meta);
const logger = consoleLogger('test:binManager');
const binManager = new BinManager();
const configtxYaml = path.resolve(__dirname, '../../config/configtx.yaml');
process.env.binPath = path.resolve(__dirname, '../../bin');
const blockProfiles = [
	'SampleDevModeEtcdRaft'
];
const channelProfiles = ['SampleSingleMSPChannel'];
fsExtra.ensureDirSync(path.resolve(__dirname, 'artifacts'));
const genBlockTest = async (blockProfile) => {
	const blockFile = path.resolve(__dirname, `artifacts/${blockProfile}.block`);
	await binManager.configtxgen(blockProfile, configtxYaml).genBlock(blockFile);
	logger.info(`genBlock[${blockProfile}]`);
};

const viewBlockTest = async (blockProfile) => {
	const blockFile = path.resolve(__dirname, `artifacts/${blockProfile}.block`);
	const result = await binManager.configtxgen(blockProfile, configtxYaml).viewBlock(blockFile);
	logger.info(`viewBlock[${blockProfile}]`, result);
};
const genChannelTest = async (channelProfile, channelName = channelProfile) => {
	const channelFile = path.resolve(__dirname, `artifacts/${channelProfile}.tx`);
	await binManager.configtxgen(channelProfile, configtxYaml, channelName).genTx(channelFile);
	logger.info(`genChannel[${channelProfile}]`);
};
const viewChannelTest = async (channelProfile, channelName = channelProfile) => {
	const channelFile = path.resolve(__dirname, `artifacts/${channelProfile}.tx`);
	const result = await binManager.configtxgen(channelProfile, configtxYaml, channelName).viewChannel(channelFile);
	logger.info(`viewChannel[${channelProfile}]`, result);
};

describe('configtxlator', () => {
	it('configtxlatorRestart', async () => {
		await binManager.configtxlatorRESTServer('start');
		await binManager.configtxlatorRESTServer('down');
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
		for (const profile of channelProfiles) {
			await genChannelTest(profile);
			await viewChannelTest(profile);
		}
	});
});
