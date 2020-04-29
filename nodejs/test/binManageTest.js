const path = require('path');
process.env.binPath = path.resolve(__dirname, '../../bin');
const BinManager = require('../binManager');
const fsExtra = require('fs-extra');
const binManager = new BinManager();
const configtxYaml = path.resolve(__dirname, '../../config/configtx.yaml');
const logger = require('../logger').new('test:binManager', true);
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
	await binManager.configtxgen(channelProfile, configtxYaml, channelName).genChannel(channelFile);
	logger.info(`genChannel[${channelProfile}]`);
};
const viewChannelTest = async (channelProfile, channelName = channelProfile) => {
	const channelFile = path.resolve(__dirname, `artifacts/${channelProfile}.tx`);
	const result = await binManager.configtxgen(channelProfile, configtxYaml, channelName).viewChannel(channelFile);
	logger.info(`viewChannel[${channelProfile}]`, result);
};

const configtxlatorRestart = async () => {
	await binManager.configtxlatorRESTServer('start');
	await binManager.configtxlatorRESTServer('down');
};
const taskConfigtxlator = async () => {
	await configtxlatorRestart();
};

const taskConfigtxgen = async () => {
	for (const profile of blockProfiles) {
		if (profile === 'SampleDevModeEtcdRaft') {
			logger.warn('skip SampleDevModeEtcdRaft due to : path/to/ClientTLSCert0: no such file or directory');
			continue;
		}
		await genBlockTest(profile);
		await viewBlockTest(profile);
	}
	for (const profile of channelProfiles) {
		await genChannelTest(profile);
		await viewChannelTest(profile);
	}
};
taskConfigtxlator();
taskConfigtxgen();
