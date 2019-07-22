const path = require('path');
process.env.binPath = path.resolve(__dirname, '../../bin');
const BinManager = require('../binManager');
const binManager = new BinManager();


const viewBlockTask = async () => {
	const blockProfile = 'delphiGenesis';
	const blockFile = '/home/davidliu/Documents/delphi-fabric/config/configtx/delphi.block';
	const configtxYaml = '/home/davidliu/Documents/delphi-fabric/config/configtx.yaml';
	const resultJSObject = await binManager.configtxgen(blockProfile, configtxYaml).viewBlock(blockFile);
	console.info(resultJSObject);
};
const viewChannelTxTask = async () => {
	const channelName = 'allchannel';
	const channelProfile = 'allchannel';
	const configtxYaml = '/home/davidliu/Documents/delphi-fabric/config/configtx.yaml';
	const channeltxFile = '/home/davidliu/Documents/delphi-fabric/config/configtx/all.tx';
	const resultJSObject = await binManager.configtxgen(channelProfile, configtxYaml, channelName).viewChannel(channeltxFile);
	console.info(resultJSObject);
};
const configtxlatorRestart = async () => {
	await binManager.configtxlator('down');
	await binManager.configtxlator('start');
};
const task = async () => {
	await viewChannelTxTask();

};

task();
