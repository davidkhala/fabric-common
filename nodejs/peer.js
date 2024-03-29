import {LoggingLevel} from 'khala-fabric-formatter/remote.js';
import {MetricsProvider} from 'khala-fabric-formatter/constants.js';
import {uid} from '@davidkhala/light/devOps.js';

export const container = {
	MSPROOT: '/etc/hyperledger/crypto-config',
	dockerSock: '/run/containerd/containerd.sock',
	state: '/var/hyperledger/production',
	config: '/var/hyperledger/fabric',
	'volume-state': '/var/hyperledger/',
	builder: '/opt/hyperledger/ccaas_builder/',
};

export const host = {
	dockerSock: `/run/user/${uid}/docker.sock`,
};
export const statePath = {
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
 * @param [tls]
 * @param [couchDB]
 * @param {LoggingLevel} [loggingLevel]
 * @param [operationsOpts]
 * @param [metricsOpts]
 * @param [chaincodeOpts]
 * @returns {string[]}
 */
export const envBuilder = ({
	network,
	msp: {configPath, id, peerHostName},
	tls,
	couchDB
}, loggingLevel, operationsOpts, metricsOpts, chaincodeOpts) => {
	let environment =
		[
			`CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${network}`,
			`CORE_VM_ENDPOINT=unix://${container.dockerSock}`,
			'CORE_LEDGER_HISTORY_ENABLEHISTORYDATABASE=true',
			'CORE_PEER_GOSSIP_USELEADERELECTION=false', // FAB-15317
			'CORE_PEER_GOSSIP_ORGLEADER=true', // FAB-15317
			'CORE_PEER_GOSSIP_STATE_ENABLED=true', // FAB-15317
			`CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peerHostName}:7051`,
			`CORE_PEER_LOCALMSPID=${id}`,
			`CORE_PEER_MSPCONFIGPATH=${configPath}`,
			`CORE_PEER_TLS_ENABLED=${!!tls}`,
			`CORE_PEER_ID=${peerHostName}`,
			`CORE_PEER_ADDRESS=${peerHostName}:7051`,
		];
	if (chaincodeOpts) {
		const {attachLog, dockerPort, tls, external} = chaincodeOpts;

		if (tls) {
			const {ca, cert, key} = tls;
			environment = environment.concat([
				`CORE_VM_DOCKER_TLS_ENABLED=true`,
				`CORE_VM_DOCKER_TLS_CA_FILE=${ca}`,
				`CORE_VM_DOCKER_TLS_CERT_FILE=${cert}`,
				`CORE_VM_DOCKER_TLS_KEY_FILE=${key}`,
			]);

		}
		if (dockerPort) {
			environment.push(`CORE_VM_ENDPOINT=${tls ? 'https' : 'http'}://host.docker.internal:${dockerPort}`);
			environment.push(`CORE_CHAINCODE_EXTERNALBUILDERS=[]`);
		} else if (external) {
			environment.push(`CORE_VM_ENDPOINT`); // TODO un-configure

		}


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
		const {container_name, user = 'admin', password = 'adminpw'} = couchDB;
		environment = environment.concat([
			'CORE_LEDGER_STATE_STATEDATABASE=CouchDB',
			`CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${container_name}:5984`,
			`CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=${user}`,
			`CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=${password}`,
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
