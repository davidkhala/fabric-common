import {LoggingLevel, rootCAsStringBuilder} from 'khala-fabric-formatter/remote.js';
import {OrdererType, MetricsProvider} from 'khala-fabric-formatter/constants.js';
export const container = {
	CONFIGTX: '/etc/hyperledger/configtx',
	state: '/var/hyperledger/production/orderer/',
	config: '/etc/hyperledger/'
};
/**
 * [release-2.3] system chain removal

 * @param opts
 * @param loggingLevel
 * @param operationsOpts
 * @param metricsOpts
 * @returns {string[]}
 */
export const envBuilder = (opts, loggingLevel, operationsOpts, metricsOpts) => {

	const {
		bootStrapFile, // block file relative path, if unset, adopt no-genesis orderer mode
		msp: {configPath, id},
		tls,
		/**
		 * @type {OrdererType}
		 */
		ordererType,
		raft_tls,
		/**
		 * default to tls
		 */
		admin_tls = tls
	} = opts;
	let env = [
		'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0', // used to self identify
		`ORDERER_GENERAL_TLS_ENABLED=${!!tls}`,
		`ORDERER_GENERAL_LOCALMSPID=${id}`,
		`ORDERER_GENERAL_LOCALMSPDIR=${configPath}`,
	];
	if (bootStrapFile) {
		env = env.concat([
			'ORDERER_GENERAL_BOOTSTRAPMETHOD=file',
			`ORDERER_GENERAL_BOOTSTRAPFILE=${container.CONFIGTX}/${bootStrapFile}`,
		]);
	} else {
		env = env.concat([
			'ORDERER_GENERAL_BOOTSTRAPMETHOD=none',
			'ORDERER_CHANNELPARTICIPATION_ENABLED=true',
			'ORDERER_ADMIN_LISTENADDRESS=0.0.0.0:9443',
			`ORDERER_ADMIN_TLS_ENABLED=${!!admin_tls}`,
		]);
		if (admin_tls) {
			env = env.concat([
				`ORDERER_ADMIN_TLS_PRIVATEKEY=${admin_tls.key}`,
				`ORDERER_ADMIN_TLS_CERTIFICATE=${admin_tls.cert}`,
				`ORDERER_ADMIN_TLS_ROOTCAS=[${rootCAsStringBuilder(admin_tls)}]`,
				`ORDERER_ADMIN_TLS_CLIENTROOTCAS=[${rootCAsStringBuilder(admin_tls)}]`,
			]);
		}
	}

	if (loggingLevel) {
		env.push(`FABRIC_LOGGING_SPEC=${LoggingLevel[loggingLevel]}`);
	}

	if (tls) {
		env = env.concat([
			`ORDERER_GENERAL_TLS_PRIVATEKEY=${tls.key}`,
			`ORDERER_GENERAL_TLS_CERTIFICATE=${tls.cert}`,
			`ORDERER_GENERAL_TLS_ROOTCAS=[${rootCAsStringBuilder(tls)}]`
		]);
	}
	switch (ordererType) {
		case OrdererType.etcdraft:
			env = env.concat([
				`ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=${raft_tls.cert}`,
				`ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=${raft_tls.key}`,
				`ORDERER_GENERAL_CLUSTER_ROOTCAS=[${rootCAsStringBuilder(raft_tls)}]`,
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
				`ORDERER_OPERATIONS_TLS_CLIENTROOTCAS=[${rootCAsStringBuilder(operationsTLS)}]`
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

