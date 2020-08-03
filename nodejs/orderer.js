const {LoggingLevel} = require('khala-fabric-formatter/remote');
const {OrdererType, MetricsProvider} = require('khala-fabric-formatter/constants');
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
exports.envBuilder = ({BLOCK_FILE, msp: {configPath, id}, tls, ordererType, raft_tls}, loggingLevel, operationsOpts, metricsOpts) => {
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
		case OrdererType.etcdraft:
			env = env.concat([
				`ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=${raft_tls.cert}`,
				`ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=${raft_tls.key}`,
			]);
			if (!tls) {
				env = env.concat([
					`ORDERER_GENERAL_CLUSTER_LISTENPORT=${raft_tls.port || 7050}`,
					`ORDERER_GENERAL_CLUSTER_LISTENADDRESS=${raft_tls.host || '0.0.0.0'}`,
					`ORDERER_GENERAL_CLUSTER_SERVERCERTIFICATE=${raft_tls.cert}`,
					`ORDERER_GENERAL_CLUSTER_SERVERPRIVATEKEY=${raft_tls.key}`
				]);
			}
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

