const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
const Logger = require('./logger');
const logger = Logger.new('orderer');
exports.find = ({orderers, ordererUrl}) => {
	return ordererUrl ? orderers.find((orderer) => orderer.getUrl() === ordererUrl) : orderers[0];
};
exports.new = ({ordererPort, cert, pem, ordererHostName, host}) => {
	const Host = host ? host : 'localhost';
	let orderer_url = `grpcs://${Host}:${ordererPort}`;
	if (!pem) {
		if (fs.existsSync(cert)) {
			pem = fs.readFileSync(cert).toString();
		}
	}
	if (pem) {
		// tls enabled
		const orderer = new Orderer(orderer_url, {
			pem,
			'ssl-target-name-override': ordererHostName
		});
		orderer.pem = pem;
		return orderer;
	} else {
		// tls disabled
		orderer_url = `grpc://${Host}:${ordererPort}`;
		return new Orderer(orderer_url);
	}

};
exports.container = {
	CONFIGTX: '/etc/hyperledger/configtx',
	state: '/var/hyperledger/production/orderer/',
	config: '/etc/hyperledger/'
};
/**
 * if no blockFile:
 * panic: Unable to bootstrap orderer. Error reading genesis block file: open /etc/hyperledger/fabric/genesisblock: no such file or directory
 * when ORDERER_GENERAL_GENESISMETHOD=provisional  ORDERER_GENERAL_GENESISPROFILE=SampleNoConsortium
 *  -> panic: No system chain found.  If bootstrapping, does your system channel contain a consortiums group definition
 * @param BLOCK_FILE
 * @param tls
 * @param configPath
 * @param id
 * @param kafkas
 * @param loggingLevel
 * @param operationOpts
 * @returns {string[]}
 */
exports.envBuilder = ({BLOCK_FILE, msp: {configPath, id}, kafkas, tls}, loggingLevel, operationOpts) => {
	let env = [
		`FABRIC_LOGGING_SPEC=${loggingLevel ? exports.loggingLevels[loggingLevel] : 'DEBUG'}`,
		'ORDERER_GENERAL_LISTENADDRESS=0.0.0.0', // TODO useless checking
		`ORDERER_GENERAL_TLS_ENABLED=${!!tls}`,
		'ORDERER_GENERAL_GENESISMETHOD=file',
		`ORDERER_GENERAL_GENESISFILE=${exports.container.CONFIGTX}/${BLOCK_FILE}`,
		`ORDERER_GENERAL_LOCALMSPID=${id}`,
		`ORDERER_GENERAL_LOCALMSPDIR=${configPath}`,
		'GODEBUG=netdns=go' // aliyun only
	];

	if (tls) {
		let rootCAs = [];
		rootCAs.push(tls.caCert);
		if (Array.isArray(tls.rootCAs)) {
			rootCAs = rootCAs.concat(tls.rootCAs);
		}
		env = env.concat([
			`ORDERER_GENERAL_TLS_PRIVATEKEY=${tls.key}`,
			`ORDERER_GENERAL_TLS_CERTIFICATE=${tls.cert}`,
			`ORDERER_GENERAL_TLS_ROOTCAS=[${rootCAs.join(',')}]`]);

	}
	if (kafkas) {
		env = env.concat([
			'ORDERER_KAFKA_RETRY_SHORTINTERVAL=1s',
			'ORDERER_KAFKA_RETRY_SHORTTOTAL=30s',
			'ORDERER_KAFKA_VERBOSE=true'
		]);

	}
	if (operationOpts) {
		const {TLS} = operationOpts;// TODO TLS
		env = env.concat([
			'ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:8443'
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