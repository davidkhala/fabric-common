const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');
const EndPoint = require('fabric-common/lib/Endpoint');
const Committer = require('fabric-common/lib/Committer');

class Orderer {
	/**
	 * @param {intString|integer} ordererPort
	 * @param {string} [cert] TLS CA certificate file path
	 * @param {CertificatePem} [pem] TLS CA certificate
	 * @param {SSLTargetNameOverride} [ordererHostName]
	 * @param {string} [host]
	 * @param {ClientKey} [clientKey]
	 * @param {ClientCert} [clientCert]
	 */
	constructor({ordererPort, cert, pem, ordererHostName, host, clientKey, clientCert}) {
		if (!pem) {
			if (fs.existsSync(cert)) {
				pem = fs.readFileSync(cert).toString();
			}
		}

		this.host = host ? host : (ordererHostName ? ordererHostName : 'localhost');
		let ordererUrl;
		if (pem) {
			// tls enabled
			ordererUrl = `grpcs://${this.host}:${ordererPort}`;
			this.pem = pem;
			this.sslTargetNameOverride = ordererHostName;
			this.clientKey = clientKey;
			this.clientCert = clientCert;
		} else {
			// tls disabled
			ordererUrl = `grpc://${this.host}:${ordererPort}`;
		}
		const options = RemoteOptsTransform({
			url: ordererUrl,
			host: this.host,
			pem,
			sslTargetNameOverride: this.sslTargetNameOverride,
			clientKey: this.clientKey,
			clientCert: this.clientCert
		});
		this.endpoint = new EndPoint(options);
		const orderer = new Committer(this.endpoint.url, {}, undefined);
		orderer.setEndpoint(this.endpoint);
		this.orderer = orderer;
	}

	/**
	 * basic health check for an orderer
	 * @param {Committer} orderer
	 */
	static async ping(orderer) {
		try {
			orderer.service = new orderer.serviceClass(orderer.endpoint.addr, orderer.endpoint.creds, orderer.options);
			await orderer.waitForReady(orderer.service);
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

module.exports = Orderer;