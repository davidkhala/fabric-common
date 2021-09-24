const {TLS} = require('../../../../config/orgs.json');
const {Endorser, Endpoint, Discoverer} = require('fabric-common');
const fs = require('fs');
const path = require('path');

const cryptoRoot = path.resolve(__dirname, '../../../../config/ca-crypto-config');
const orgName = 'icdd';

const cert = path.resolve(cryptoRoot, 'peerOrganizations', orgName, 'tlsca', `tlsca.${orgName}-cert.pem`);
const pem = fs.readFileSync(cert).toString();

const peerPort = 8051;
const host = 'localhost';
const peerURL = `grpcs://${host}:${peerPort}`;
const peerHost = 'peer0.icdd';

const mspId = 'icddMSP';


const options = {
	url: peerURL,
	'grpc-wait-for-ready-timeout': 30000
};
if (TLS) {
	Object.assign(options, {pem, 'grpc.ssl_target_name_override': peerHost});
}
const endpoint = new Endpoint(options);

const main = async () => {
	const endorser = new Endorser('myEndorser', {}, mspId);
	endorser.setEndpoint(endpoint);
	await endorser.connect();

	const discoverer = new Discoverer('myDiscoverer', {}, mspId);
	discoverer.setEndpoint(endpoint);

	await discoverer.connect();
	//---- query on system chaincode to getChainInfo

	const channelName = 'allchannel';
	const chaincodeId = 'qscc';
	const fcn = 'GetChainInfo';
	const args = [channelName];


	const {Gateway} = require('fabric-network');
	const Client = require('fabric-common/lib/Client');
	const IdentityContext = require('fabric-common/lib/IdentityContext');
	const SigningIdentity = require('../signingIdentity');
	const {getSampleUser} = require('./testUtil');

	const gateWay = new Gateway();
	const client = new Client(null);
	const user = getSampleUser();
	const identity = new SigningIdentity(user._signingIdentity);
	gateWay.identity = identity;
	gateWay.identityContext = new IdentityContext(user, client);


	const channel = client.newChannel(channelName);
	client.channels.set(channelName, channel);


	channel.getEndorsers = (mspid) => Array.from(channel.endorsers.values());


	channel.endorsers.set(endorser.toString(), endorser);


	await gateWay.connect(client, {
		wallet: {}, discovery: {enabled: false}, identity
	});


	const network = await gateWay.getNetwork(channelName);

	const contract = network.getContract(chaincodeId);

	const tx = contract.createTransaction(fcn);

	const resultProto = await tx.evaluate(...args);
	const {common: commonProto} = require('fabric-protos');
	const bufferToString = (_resultProto) => {
		const {height, currentBlockHash, previousBlockHash} = commonProto.BlockchainInfo.decode(_resultProto);
		return {
			height: height.toInt(),
			currentBlockHash: currentBlockHash.toString('hex'),
			previousBlockHash: previousBlockHash.toString('hex'),
		};
	};
	const result = bufferToString(resultProto);
	console.debug(result);

};
main();
