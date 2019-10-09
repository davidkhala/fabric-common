const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
const logger = require('./logger').new('orderer');
const {loggingLevels, RemoteOptsTransform} = require('./remote');
exports.find = ({orderers, ordererUrl}) => {
	return ordererUrl ? orderers.find((orderer) => orderer.getUrl() === ordererUrl) : orderers[0];
};
/**
 *
 * @param ordererPort
 * @param cert
 * @param pem
 * @param {string} [ordererHostName] Used in test environment only, when the server certificate's
 *    hostname (in the 'CN' field) does not match the actual host endpoint that the server process runs
 *    at, the application can work around the client TLS verify failure by setting this property to the
 *    value of the server certificate's hostname
 * @param host
 * @param {ClientKey} [clientKey]
 * @param {ClientCert} [clientCert]
 */
exports.new = ({ordererPort, cert, pem, ordererHostName, host, clientKey, clientCert}) => {
	const Host = host ? host : 'localhost';
	let orderer_url = `grpcs://${Host}:${ordererPort}`;
	if (!pem) {
		if (fs.existsSync(cert)) {
			pem = fs.readFileSync(cert).toString();
		}
	}
	if (pem) {
		// tls enabled
		const opts = RemoteOptsTransform({host, pem, sslTargetNameOverride: ordererHostName, clientKey, clientCert});
		const orderer = new Orderer(orderer_url, opts);
		orderer.pem = pem;
		return orderer;
	} else {
		// tls disabled
		orderer_url = `grpc://${Host}:${ordererPort}`;
		return new Orderer(orderer_url);
	}

};
const containerDefaultPaths = {
	CONFIGTX: '/etc/hyperledger/configtx',
	state: '/var/hyperledger/production/orderer/',
	config: '/etc/hyperledger/'
};
exports.container = containerDefaultPaths;
/**
 * if no blockFile:
 * panic: Unable to bootstrap orderer. Error reading genesis block file: open /etc/hyperledger/fabric/genesisblock: no such file or directory
 * when ORDERER_GENERAL_GENESISMETHOD=provisional  ORDERER_GENERAL_GENESISPROFILE=SampleNoConsortium
 *  -> panic: No system chain found.  If bootstrapping, does your system channel contain a consortiums group definition
 * @param BLOCK_FILE
 * @param tls
 * @param configPath
 * @param id
 * @param {string} OrdererType solo|etcdraft|kafka
 * @param loggingLevel
 * @param operationOpts
 * @returns {string[]}
 */
exports.envBuilder = ({BLOCK_FILE, msp: {configPath, id}, tls, OrdererType}, loggingLevel, operationOpts) => {
	let env = [
		'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0', // used to self identify
		`ORDERER_GENERAL_TLS_ENABLED=${!!tls}`,
		'ORDERER_GENERAL_GENESISMETHOD=file',
		`ORDERER_GENERAL_GENESISFILE=${containerDefaultPaths.CONFIGTX}/${BLOCK_FILE}`,
		`ORDERER_GENERAL_LOCALMSPID=${id}`,
		`ORDERER_GENERAL_LOCALMSPDIR=${configPath}`,
		'GODEBUG=netdns=go' // aliyun only
	];

	if (loggingLevel) {
		env.push(`FABRIC_LOGGING_SPEC=${loggingLevels[loggingLevel]}`);
	}
	const rootCAsStringBuild = (tls) => {
		let rootCAs = [tls.caCert];
		if (Array.isArray(tls.rootCAs)) {
			rootCAs = rootCAs.concat(tls.rootCAs);
		}
		return rootCAs.join(',');
	};
	if (tls) {
		env = env.concat([
			`ORDERER_GENERAL_TLS_PRIVATEKEY=${tls.key}`,
			`ORDERER_GENERAL_TLS_CERTIFICATE=${tls.cert}`,
			`ORDERER_GENERAL_TLS_ROOTCAS=[${rootCAsStringBuild(tls)}]`]);
	}
	switch (OrdererType) {
		case 'kafka':
			env = env.concat([
				'ORDERER_KAFKA_RETRY_SHORTINTERVAL=1s',
				'ORDERER_KAFKA_RETRY_SHORTTOTAL=30s',
				'ORDERER_KAFKA_VERBOSE=true'
			]);
			break;
		case 'etcdraft':
			env = env.concat([
				'ORDERER_GENERAL_CLUSTER_SENDBUFFERSIZE=10'  // maximum number of messages in the egress buffer.Consensus messages are dropped if the buffer is full, and transaction messages are waiting for space to be freed.
			]);
			if (tls) {
				env = env.concat([
					`ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=${tls.cert}`,
					`ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=${tls.key}`,
					`ORDERER_GENERAL_CLUSTER_ROOTCAS=[${rootCAsStringBuild(tls)}]`
				]);
			}
			break;
		case 'solo':
			break;
	}
	if (operationOpts) {
		// metrics provider is one of statsd, prometheus, or disabled
		const {tls, metrics = 'disabled'} = operationOpts;// TODO TLS
		env = env.concat([
			'ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:8443',
			`ORDERER_METRICS_PROVIDER=${metrics}`
		]);
	}
	return env;
};
/**
 * basic health check for an orderer
 * @param {Orderer} orderer
 */
exports.ping = async (orderer) => {
	try {
		await orderer.waitForReady(orderer._ordererClient);
		return true;
	} catch (err) {
		if (err.message.includes('Failed to connect before the deadline')) {
			logger.warn('ping:dead', orderer.getName());
			return false;
		} else {
			throw err;
		}
	}
};
exports.Orderer = Orderer;