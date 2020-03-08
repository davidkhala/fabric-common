const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');

class OrdererManager {
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
		this.port = ordererPort;
		if (pem) {
			// tls enabled
			const url = `grpcs://${this.host}:${ordererPort}`;
			this.pem = pem;
			this.sslTargetNameOverride = ordererHostName;
			this.clientKey = clientKey;
			this.clientCert = clientCert;
			const opts = RemoteOptsTransform({
				host: this.host,
				pem,
				sslTargetNameOverride: ordererHostName,
				clientKey,
				clientCert
			});
			this.orderer = new Orderer(url, opts);
		} else {
			// tls disabled
			const url = `grpc://${this.host}:${ordererPort}`;
			this.orderer = new Orderer(url);
		}
	}

	/**
	 * basic health check for an orderer
	 * @param {Orderer} orderer
	 */
	static async ping(orderer) {
		try {
			await orderer.waitForReady(orderer._ordererClient);
			orderer._ordererClient.close();
			return true;
		} catch (err) {
			if (err.message.includes('Failed to connect before the deadline')) {
				return false;
			} else {
				throw err;
			}
		}
	}

	async ping() {
		return await OrdererManager.ping(this.orderer);
	}
}

module.exports = OrdererManager;