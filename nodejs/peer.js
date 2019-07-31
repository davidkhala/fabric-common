const Peer = require('fabric-client/lib/Peer');
const {fsExtra} = require('khala-nodeutils/helper');
const logger = require('khala-logger').new('peer');
const {RequestPromise} = require('khala-nodeutils/request');
exports.new = ({peerPort, peerHostName, cert, pem, host}) => {
	const Host = host ? host : 'localhost';
	let peerUrl = `grpcs://${Host}:${peerPort}`;
	if (!pem) {
		if (fsExtra.existsSync(cert)) {
			pem = fsExtra.readFileSync(cert).toString();
		}
	}
	if (pem) {
		// tls enabled
		const peer = new Peer(peerUrl, {
			pem,
			'ssl-target-name-override': peerHostName
		});
		peer.pem = pem;
		return peer;
	} else {
		// tls disaled
		peerUrl = `grpc://${Host}:${peerPort}`;
		return new Peer(peerUrl);
	}
};
exports.getName = (peer) => {
	const originName = peer.toString();
	if (originName.includes('://localhost') && peer._options['grpc.ssl_target_name_override']) {
		return peer._options['grpc.ssl_target_name_override'];
	} else {
		return originName;
	}
};
exports.formatPeerName = (peerName, domain) => `${peerName}.${domain}`;

exports.container =
	{
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
 * Valid logging levels are case-insensitive string
 * @type {string[]}
 */
const loggingLevels = ['FATAL', 'PANIC', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];
exports.loggingLevels = loggingLevels;
/**
 *
 * @param network
 * @param configPath
 * @param id
 * @param peerHostName
 * @param tls
 * @param couchDB
 * @param {number} loggingLevel index of [loggerLevels]{@link loggingLevels}
 * @param operationOpts
 * @returns {string[]}
 */
exports.envBuilder = ({network, msp: {configPath, id, peerHostName}, tls, couchDB}, loggingLevel, operationOpts) => {
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
			'CORE_CHAINCODE_EXECUTETIMEOUT=180s',
			'CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052', // for swarm mode
			'GODEBUG=netdns=go'// NOTE aliyun only
		];
	if (loggingLevel) {
		environment = environment.concat([
			`FABRIC_LOGGING_SPEC=${loggingLevels[loggingLevel]}`,
			`CORE_CHAINCODE_LOGGING_LEVEL=${loggingLevels[loggingLevel]}` // used for chaincode logging
		]);
	}
	if (tls) {
		environment = environment.concat([
			`CORE_PEER_TLS_KEY_FILE=${tls.key}`,
			`CORE_PEER_TLS_CERT_FILE=${tls.cert}`,
			`CORE_PEER_TLS_ROOTCERT_FILE=${tls.caCert}`]);
	}
	// TODO CORE_CHAINCODE_LOGGING_SHIM :used for fabric logging
	if (couchDB) {
		const {container_name, user = '', password = ''} = couchDB;
		environment = environment.concat([
			'CORE_LEDGER_STATE_STATEDATABASE=CouchDB',
			`CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${container_name}:5984`,
			`CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=${user}`,
			`CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=${password}`
		]);
	}
	if (operationOpts) {
		// metrics provider is one of statsd, prometheus, or disabled
		const {tls, metrics = 'disabled', statsd} = operationOpts; // TODO another set of TLS,
		// omit the ip/domain in listenAddress will allow all traffic
		environment = environment.concat([
			'CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:9443',
			`CORE_METRICS_PROVIDER=${metrics}`
		]);
	}
	return environment;
};


/**
 * basic health check by discoveryClient
 * @param {Peer} peer
 * @return {Promise<boolean>} false if connect trial failed
 */
exports.ping = async (peer) => {
	try {
		logger.debug('ping', peer.toString());
		await peer.waitForReady(peer._discoveryClient);
		return true;
	} catch (err) {
		if (err.message.includes('Failed to connect before the deadline')) {
			return false;
		} else {
			throw err;
		}
	} finally {
		logger.debug('pong', peer.toString());
	}
};

/**
 * /healthz official health check, for peer and orderer
 * TODO to support https
 * -- introduced from 1.4
 * @param baseUrl ${domain:port}
 * @param otherOptions
 * @returns {Promise}
 */
exports.health = async (baseUrl, otherOptions) => {
	const url = `${baseUrl}/healthz`;
	const result = await RequestPromise({url, method: 'GET'}, otherOptions);
	if (result.status === 'OK') {
		return result;
	} else {
		const err = Error('healthz check');
		err.url = url;
		err.result = result;
		throw err;
	}
};
exports.getLogLevel = async (baseUrl, otherOptions) => {
	const url = `${baseUrl}/logspec`;
	const {spec} = await RequestPromise({url, method: 'GET'}, otherOptions);
	return spec;
};
/**
 * @param {string} baseUrl
 * @param {string|number} level FATAL | PANIC | ERROR | WARNING | INFO | DEBUG, validation will be completed by service
 * @param otherOptions
 * @returns {Promise<void>}
 */
exports.setLogLevel = async (baseUrl, level, otherOptions) => {
	const url = `${baseUrl}/logspec`;
	if (Number.isInteger(level)) {
		level = loggingLevels[level];
	}
	return await RequestPromise({url, method: 'PUT', body: {spec: level}}, otherOptions);
};
exports.Peer = Peer;