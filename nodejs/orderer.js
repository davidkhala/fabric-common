const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
const logger = require('./logger').new('orderer');
const {LoggingLevel, RemoteOptsTransform} = require('./remote');
const {OrdererType, MetricsProvider} = require('./constants');
exports.find = (orderers, {ordererUrl}) => {
	return ordererUrl ? orderers.find((orderer) => orderer.getUrl() === ordererUrl) : orderers[0];
};
/**
 *
 * @param {intString} ordererPort
 * @param {string} [cert] TLS CA certificate file path
 * @param {CertificatePem} pem TLS CA certificate
 * @param {string} [ordererHostName] Used in test environment only, when the server certificate's
 *    hostname (in the 'CN' field) does not match the actual host endpoint that the server process runs
 *    at, the application can work around the client TLS verify failure by setting this property to the
 *    value of the server certificate's hostname
 * @param {string} [host]
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
		orderer.host = host ? host : (ordererHostName ? ordererHostName : 'localhost');
		return orderer;
	} else {
		// tls disabled
		orderer_url = `grpc://${Host}:${ordererPort}`;
		const orderer = new Orderer(orderer_url);
		orderer.host = Host;
		return orderer;
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
 * @param {OrdererType} ordererType
 * @param raft_tls
 * @param loggingLevel
 * @param operationsOpts
 * @param metricsOpts
 * @returns {string[]}
 */
exports.envBuilder = ({BLOCK_FILE, msp: {configPath, id}, tls, ordererType, raft_tls = tls}, loggingLevel, operationsOpts, metricsOpts) => {
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
		env.push(`FABRIC_LOGGING_SPEC=${LoggingLevel[loggingLevel]}`);
	}
	const rootCAsStringBuild = ({caCert, rootCAs}) => {
		let result = [caCert];
		if (Array.isArray(rootCAs)) {
			result = result.concat(rootCAs);
		}
		return result.join(',');
	};
	if (tls) {
		env = env.concat([
			`ORDERER_GENERAL_TLS_PRIVATEKEY=${tls.key}`,
			`ORDERER_GENERAL_TLS_CERTIFICATE=${tls.cert}`,
			`ORDERER_GENERAL_TLS_ROOTCAS=[${rootCAsStringBuild(tls)}]`]);
	}
	switch (ordererType) {
		case OrdererType.kafka:
			env = env.concat([
				'ORDERER_KAFKA_RETRY_SHORTINTERVAL=1s',
				'ORDERER_KAFKA_RETRY_SHORTTOTAL=30s',
				'ORDERER_KAFKA_VERBOSE=true'
			]);
			break;
		case OrdererType.etcdraft:
			env = env.concat([
				'ORDERER_GENERAL_CLUSTER_SENDBUFFERSIZE=10'  // maximum number of messages in the egress buffer.Consensus messages are dropped if the buffer is full, and transaction messages are waiting for space to be freed.
			]);
			if (!raft_tls) {
				throw Error('etcdraft orderer must have mutual TLS configurations');
			}
			env = env.concat([
				`ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=${raft_tls.cert}`,
				`ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=${raft_tls.key}`,
				`ORDERER_GENERAL_CLUSTER_ROOTCAS=[${rootCAsStringBuild(raft_tls)}]`
			]);
			break;
	}
	if (operationsOpts) {
		env = env.concat([
			'ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:8443'
		]);

		const operationsTLS = operationsOpts.tls || tls;

		if (operationsTLS) {
			env = env.concat([
				'ORDERER_OPERATIONS_TLS_ENABLED=true',
				`ORDERER_OPERATIONS_TLS_CERTIFICATE=${operationsTLS.cert}`,
				`ORDERER_OPERATIONS_TLS_PRIVATEKEY=${operationsTLS.key}`,
				'ORDERER_OPERATIONS_TLS_CLIENTAUTHREQUIRED=false', // see in README.md
				`ORDERER_OPERATIONS_TLS_CLIENTROOTCAS=[${rootCAsStringBuild(operationsTLS)}]`
			]);
		}
	}
	if (metricsOpts) {
		const {provider} = metricsOpts;
		env = env.concat([
			`ORDERER_METRICS_PROVIDER=${MetricsProvider[provider]}`
		]);
	}
	return env;
};
/**
 * basic health check for an orderer
 * @param {Orderer} orderer
 */
const ping = async (orderer) => {
	try {
		await orderer.waitForReady(orderer._ordererClient);
		orderer._ordererClient.close();
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
exports.ping = ping;
exports.filter = async (orderers, healthOnly) => {
	const result = [];
	for (const orderer of orderers) {
		if (healthOnly) {
			const isAlive = await ping(orderer);
			if (!isAlive) {
				continue;
			}
		}
		result.push(orderer);
	}
	return result;
};
exports.Orderer = Orderer;
