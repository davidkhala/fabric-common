const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');

class OrdererBuilder {
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
		if (pem) {
			// tls enabled
			this.ordererUrl = `grpcs://${this.host}:${ordererPort}`;
			this.pem = pem;
			this.sslTargetNameOverride = ordererHostName;
			this.clientKey = clientKey;
			this.clientCert = clientCert;
		} else {
			// tls disabled
			this.ordererUrl = `grpc://${this.host}:${ordererPort}`;
		}
	}

	build() {
		if (this.pem) {
			// tls enabled
			const {host, pem, sslTargetNameOverride, clientKey, clientCert} = this;
			const opts = RemoteOptsTransform({host, pem, sslTargetNameOverride, clientKey, clientCert});
			return new Orderer(this.ordererUrl, opts);
		} else {
			// tls disabled
			return new Orderer(this.ordererUrl);
		}
	}
}

module.exports = OrdererBuilder;