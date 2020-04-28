const EndPoint = require('fabric-common/lib/Endpoint');
const Endorser = require('fabric-common/lib/Endorser');
const Eventer = require('fabric-common/lib/Eventer');
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
	 */
	constructor({peerPort, peerHostName, cert, pem, host, clientKey, clientCert}) {
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
		this.endpoint = new EndPoint(options);
		const endorser = new Endorser(this.endpoint.url, {}, undefined);
		endorser.setEndpoint(this.endpoint);
		this.endorser = endorser;

		const eventer = new Eventer(this.endpoint.url, {}, undefined);
		eventer.setEndpoint(this.endpoint);
		this.eventer = eventer;
	}

	/**
	 * basic health check as endorser role
	 * @return {Promise<boolean>} false if connect trial failed
	 */
	async ping() {
		try {
			const endorser = this.endorser;
			endorser.service = new endorser.serviceClass(this.endpoint.addr, this.endpoint.creds, endorser.options);
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
}


module.exports = Peer;