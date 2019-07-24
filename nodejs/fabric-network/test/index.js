const helper = require('../../../../app/helper');
const org = 'ASTRI.org';
let mspid = 'ASTRIMSP';
const peer = helper.newPeer(0, org);
const orderer = helper.newOrderers()[0];
const channelName = 'allchannel';
let chaincodeId = 'diagnose';

const task = async () => {
	const client = await helper.getOrgAdmin(org);
	const Gateway = require('../gateway');
	const gateway = new Gateway();
	const network = await gateway.connect(client, channelName, peer, mspid, orderer);
	const contract = network.getContract(chaincodeId);
	let transaction = contract.createTransaction('putRaw');
	let result = await transaction.submit('key', 'value');
	console.info(result.toString());
	transaction = contract.createTransaction('getRaw');
	result = await transaction.submit('key');
	console.info(result.toString());
	gateway.disconnect();
};
task();

