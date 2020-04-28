const {LoggingLevel} = require('khala-fabric-formatter/remote');
const {MetricsProvider} = require('./constants');

exports.getName = (peer) => {
	const originName = peer.toString();
	if (originName.includes('://localhost') && peer._options['grpc.ssl_target_name_override']) {
		return peer._options['grpc.ssl_target_name_override'];
	} else {
		return originName;
	}
};

exports.container = {
	MSPROOT: '/etc/hyperledger/crypto-config',
	dockerSock: '/host/var/run/docker.sock',
	state: '/var/hyperledger/production',
	config: '/etc/hyperledger/'
};
exports.host = {
	dockerSock: '/var/run/docker.sock' // mac system, only  /var/run/docker.sock exist.
};
exports.statePath = {
	chaincodes: undefined, // diagnose.0.0.0
	ledgersData: {
		bookkeeper: {}, // leveldb
		chains: {
			chains: [], // channel names // allchannel/blockfile_000000
			index: {}// leveldb
		},
		configHistory: {}, // leveldb
		historyLeveldb: {}, // leveldb
		ledgerProvider: {}, // leveldb
		pvtdataStore: {}, // leveldb
		stateLeveldb: {} // leveldb
	},
	transientStore: {}// leveldb
};

/**
 *
 * @param network
 * @param configPath
 * @param id
 * @param peerHostName
 * @param tls
 * @param couchDB
 * @param chaincodeConfig
 * @param {LoggingLevel} [loggingLevel]
 * @param operationsOpts
 * @param metricsOpts
 * @returns {string[]}
 */
exports.envBuilder = ({network, msp: {configPath, id, peerHostName}, tls, couchDB, chaincodeConfig}, loggingLevel, operationsOpts, metricsOpts) => {
	let environment =
		[
			`CORE_VM_ENDPOINT=unix://${exports.container.dockerSock}`,
			`CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${network}`,
			'CORE_LEDGER_HISTORY_ENABLEHISTORYDATABASE=true',
			'CORE_PEER_GOSSIP_USELEADERELECTION=true',
			'CORE_PEER_GOSSIP_ORGLEADER=false',
			`CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peerHostName}:7051`,
			`CORE_PEER_LOCALMSPID=${id}`,
			`CORE_PEER_MSPCONFIGPATH=${configPath}`,
			`CORE_PEER_TLS_ENABLED=${!!tls}`,
			`CORE_PEER_ID=${peerHostName}`,
			`CORE_PEER_ADDRESS=${peerHostName}:7051`,
			'CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052', // for swarm/k8s mode
			'GODEBUG=netdns=go' // NOTE aliyun only
		];
	if (chaincodeConfig) {
		const {attachLog} = chaincodeConfig;
		environment.push(`CORE_VM_DOCKER_ATTACHSTDOUT=${!!attachLog}`); // Enables/disables the standard out/err from chaincode containers for debugging purposes
	}
	if (loggingLevel) {
		environment = environment.concat([
			`FABRIC_LOGGING_SPEC=${LoggingLevel[loggingLevel]}`,
			`CORE_CHAINCODE_LOGGING_LEVEL=${LoggingLevel[loggingLevel]}`, // for all loggers within the chaincode container
			`CORE_CHAINCODE_LOGGING_SHIM=${LoggingLevel[loggingLevel]}` // for the 'shim' logger
		]);
	}
	if (tls) {
		environment = environment.concat([
			`CORE_PEER_TLS_KEY_FILE=${tls.key}`,
			`CORE_PEER_TLS_CERT_FILE=${tls.cert}`,
			`CORE_PEER_TLS_ROOTCERT_FILE=${tls.caCert}`]);
	}
	if (couchDB) {
		const {container_name, user = '', password = ''} = couchDB;
		environment = environment.concat([
			'CORE_LEDGER_STATE_STATEDATABASE=CouchDB',
			`CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${container_name}:5984`,
			`CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=${user}`,
			`CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=${password}`
		]);
	}
	if (operationsOpts) {
		// omit the ip/domain in listenAddress will allow all traffic
		environment = environment.concat([
			'CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:9443'
		]);
		const operationsTLS = operationsOpts.tls || tls;
		if (operationsTLS) {
			environment = environment.concat([
				'CORE_OPERATIONS_TLS_ENABLED=true',
				`CORE_OPERATIONS_TLS_CERT_FILE=${operationsTLS.cert}`,
				`CORE_OPERATIONS_TLS_KEY_FILE=${operationsTLS.key}`,
				'CORE_OPERATIONS_TLS_CLIENTAUTHREQUIRED=false', // see in README.md
				`CORE_OPERATIONS_TLS_CLIENTROOTCAS_FILES=${operationsTLS.caCert}`
			]);
		}
	}
	if (metricsOpts) {
		const {provider} = metricsOpts;
		environment = environment.concat([
			`CORE_METRICS_PROVIDER=${MetricsProvider[provider]}`
		]);
		if (provider === MetricsProvider.statsd) {
			const {statsD: {host}} = metricsOpts;
			environment = environment.concat([
				'CORE_METRICS_STATSD_NETWORK=udp',
				`CORE_METRICS_STATSD_ADDRESS=${host}:8125`,
				`CORE_METRICS_STATSD_PREFIX=${peerHostName}`
			]);
		}
	}
	return environment;
};

/**
 * basic health check by discoveryClient
 * @param {Client.Peer} peer
 * @return {Promise<boolean>} false if connect trial failed
 */
exports.ping = async (peer) => {
	try {
		await peer.waitForReady(peer._discoveryClient);
		return true;
	} catch (err) {
		if (err.message.includes('Failed to connect before the deadline')) {
			return false;
		} else {
			throw err;
		}
	}
};
