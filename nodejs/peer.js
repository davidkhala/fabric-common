const Peer = require('fabric-client/lib/Peer');
const fs = require('fs-extra');
exports.new = ({peerPort, peerHostName, cert, pem, host}) => {
	const Host = host ? host : 'localhost';
	let peerUrl = `grpcs://${Host}:${peerPort}`;
	if (!pem) {
		if (fs.existsSync(cert)) {
			pem = fs.readFileSync(cert).toString();
		}
	}
	if (pem) {
		//tls enabled
		const peer = new Peer(peerUrl, {
			pem,
			'ssl-target-name-override': peerHostName
		});
		peer.pem = pem;
		return peer;
	} else {
		//tls disaled
		peerUrl = `grpc://${Host}:${peerPort}`;
		return new Peer(peerUrl);
	}
};
exports.formatPeerName = (peerName, domain) => `${peerName}.${domain}`;

exports.container =
	{
		MSPROOT: '/etc/hyperledger/crypto-config',
		dockerSock: '/host/var/run/docker.sock',
		state: '/var/hyperledger/production'
	};
exports.host = {
	dockerSock: '/run/docker.sock'
};

exports.envBuilder = ({network, msp: {configPath, id, peerHostName}, tls}) => {
	const tlsParams = tls ? [
		`CORE_PEER_TLS_KEY_FILE=${tls.key}`,
		`CORE_PEER_TLS_CERT_FILE=${tls.cert}`,
		`CORE_PEER_TLS_ROOTCERT_FILE=${tls.caCert}`] : [];
	const environment =
		[
			`CORE_VM_ENDPOINT=unix://${module.exports.container.dockerSock}`,
			`CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${network}`,
			'CORE_LOGGING_LEVEL=DEBUG',
			'CORE_LEDGER_HISTORY_ENABLEHISTORYDATABASE=true',
			'CORE_PEER_GOSSIP_USELEADERELECTION=true',
			'CORE_PEER_GOSSIP_ORGLEADER=false',
			`CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peerHostName}:7051`, // FIXME take care!
			`CORE_PEER_LOCALMSPID=${id}`,
			`CORE_PEER_MSPCONFIGPATH=${configPath}`,
			`CORE_PEER_TLS_ENABLED=${!!tls}`,
			`CORE_PEER_ID=${peerHostName}`,
			`CORE_PEER_ADDRESS=${peerHostName}:7051`,
			'CORE_CHAINCODE_EXECUTETIMEOUT=180s',
			'CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052',//for swarm mode
			'GODEBUG=netdns=go'//NOTE aliyun only
		].concat(tlsParams);

	return environment;
};
