const EndPoint = require('fabric-common/lib/Endpoint');
const Endorser = require('fabric-common/lib/Endorser');
const Eventer = require('fabric-common/lib/Eventer');
const Discoverer = require('fabric-common/lib/Discoverer');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');
const fs = require('fs');

class Peer {
	/**
	 * @param {intString} peerPort
	 * @param {string} [peerHostName] Used in test environment only, when the server certificate's
	 *    hostname (in the 'CN' field) does not match the actual host endpoint that the server process runs
	 *    at, the application can work around the client TLS verify failure by setting this property to the
	 *    value of the server certificate's hostname
	 * @param {string} [cert] TLS CA certificate file path
	 * @param {CertificatePem} [pem] TLS CA certificate
	 * @param {string} [host]
	 * @param {ClientKey} [clientKey]
	 * @param {ClientCert} [clientCert]
	 * @param {MspId} [mspid]
	 * @param [logger]
	 */
	constructor({peerPort, peerHostName, cert, pem, host, clientKey, clientCert, mspid}, logger = console) {
		this.logger = logger;
		if (!pem) {
			if (fs.existsSync(cert)) {
				pem = fs.readFileSync(cert).toString();
			}
		}

		this.host = host ? host : (peerHostName ? peerHostName : 'localhost');
		let peerUrl;
		if (pem) {
			// tls enabled
			peerUrl = `grpcs://${this.host}:${peerPort}`;
			this.pem = pem;
			this.sslTargetNameOverride = peerHostName;
			this.clientKey = clientKey;
			this.clientCert = clientCert;
		} else {
			// tls disabled
			peerUrl = `grpc://${this.host}:${peerPort}`;
		}


		const options = RemoteOptsTransform({
			url: peerUrl,
			host: this.host,
			pem,
			sslTargetNameOverride: this.sslTargetNameOverride,
			clientKey: this.clientKey,
			clientCert: this.clientCert
		});
		const endpoint = new EndPoint(options);
		const endorser = new Endorser(endpoint.url, {}, mspid);
		endorser.setEndpoint(endpoint);
		this.endorser = endorser;

		const eventer = new Eventer(endpoint.url, {}, mspid);
		eventer.setEndpoint(endpoint);
		this.eventer = eventer;

		const discoverer = new Discoverer(endpoint.url, {}, mspid);
		discoverer.setEndpoint(endpoint);
		this.discoverer = discoverer;
	}

	getServiceEndpoints() {
		const {endorser, eventer, discoverer} = this;
		return [endorser, eventer, discoverer];
	}

	reset() {
		this.getServiceEndpoints().forEach((serviceEndpoint) => {
			serviceEndpoint.connectAttempted = false;
		});
	}

	async connect() {
		const {logger} = this;
		for (const serviceEndpoint of this.getServiceEndpoints()) {
			if (serviceEndpoint.connected || serviceEndpoint.service) {
				logger.info(`${serviceEndpoint.name} connection exist already`);
			} else {
				await serviceEndpoint.connect();
			}
		}

	}

	disconnect() {
		this.getServiceEndpoints().forEach((serviceEndpoint) => {
			serviceEndpoint.disconnect();
		});
	}

	/**
	 * basic health check as endorser role
	 * @return {Promise<boolean>} false if connect trial failed
	 */
	async ping() {
		try {
			const {endorser} = this;
			const {endpoint} = endorser;
			endorser.service = new endorser.serviceClass(endpoint.addr, endpoint.creds, endorser.options);
			await endorser.waitForReady(endorser.service);
			return true;
		} catch (err) {
			if (err.message.includes('Failed to connect before the deadline')) {
				return false;
			} else {
				throw err;
			}
		}
	}

	toString() {
		return JSON.stringify({Peer: this.endorser.endpoint.url});
	}
}


module.exports = Peer;
