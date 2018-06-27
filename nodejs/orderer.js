exports.find = ({orderers, ordererUrl}) => {
	return ordererUrl ? orderers.find((orderer) => orderer.getUrl() === ordererUrl) : orderers[0];
};
const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
exports.new = ({ordererPort, cert, pem, ordererHostName, host}) => {
	const Host = host ? host : 'localhost';
	let orderer_url = `grpcs://${Host}:${ordererPort}`;
	if (!pem) {
		if (fs.existsSync(cert)) {
			pem = fs.readFileSync(cert).toString();
		}
	}
	if (pem) {
		//tls enabled
		const orderer = new Orderer(orderer_url, {
			pem,
			'ssl-target-name-override': ordererHostName
		});
		orderer.pem = pem;
		return orderer;
	} else {
		//tls disaled
		orderer_url = `grpc://${Host}:${ordererPort}`;
		return new Orderer(orderer_url);
	}

};
exports.container = {
	CONFIGTX: '/etc/hyperledger/configtx',
	state: '/var/hyperledger/production/orderer/'
};
/**
 * if no blockFile:
 * panic: Unable to bootstrap orderer. Error reading genesis block file: open /etc/hyperledger/fabric/genesisblock: no such file or directory
 * when ORDERER_GENERAL_GENESISMETHOD=provisional  ORDERER_GENERAL_GENESISPROFILE=SampleNoConsortium
 *  -> panic: No system chain found.  If bootstrapping, does your system channel contain a consortiums group definition
 * @param tls
 * @param configPath
 * @param id
 * @param kafkas
 * @returns {string[]}
 */
exports.envBuilder = ({BLOCK_FILE, msp: {configPath, id}, kafkas, tls}) => {
	let tlsParams;
	if (tls) {
		let rootCAs = [];
		rootCAs.push(tls.caCert);
		if (Array.isArray(tls.rootCAs)) {
			rootCAs = rootCAs.concat(tls.rootCAs);
		}
		tlsParams = [
			`ORDERER_GENERAL_TLS_PRIVATEKEY=${tls.key}`,
			`ORDERER_GENERAL_TLS_CERTIFICATE=${tls.cert}`,
			`ORDERER_GENERAL_TLS_ROOTCAS=[${rootCAs.join(',')}]`];
	} else {
		tlsParams = [];
	}

	const kafkaEnv = kafkas ? ['ORDERER_KAFKA_RETRY_SHORTINTERVAL=1s',
		'ORDERER_KAFKA_RETRY_SHORTTOTAL=30s',
		'ORDERER_KAFKA_VERBOSE=true'] : [];
	const env = [
		'ORDERER_GENERAL_LOGLEVEL=debug',
		'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0',// TODO useless checking
		`ORDERER_GENERAL_TLS_ENABLED=${!!tls}`,
		'ORDERER_GENERAL_GENESISMETHOD=file',
		`ORDERER_GENERAL_GENESISFILE=${exports.container.CONFIGTX}/${BLOCK_FILE}`,
		`ORDERER_GENERAL_LOCALMSPID=${id}`,
		`ORDERER_GENERAL_LOCALMSPDIR=${configPath}`,
		'GODEBUG=netdns=go' // aliyun only
	].concat(tlsParams).concat(kafkaEnv);
	return env;
};