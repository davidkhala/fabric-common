const Peer = require('fabric-client/lib/Peer');
const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');

class PeerBuilder {
	/**
	 * @param {intString|integer} peerPort
	 * @param {SSLTargetNameOverride} [peerHostName]
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
		if (pem) {
			// tls enabled
			this.peerUrl = `grpcs://${this.host}:${peerPort}`;
			this.pem = pem;
			this.sslTargetNameOverride = peerHostName;
			this.clientKey = clientKey;
			this.clientCert = clientCert;
		} else {
			// tls disabled
			this.peerUrl = `grpc://${this.host}:${peerPort}`;
		}
	}

	build() {
		if (this.pem) {
			// tls enabled
			const {host, pem, sslTargetNameOverride, clientKey, clientCert} = this;
			const opts = RemoteOptsTransform({host, pem, sslTargetNameOverride, clientKey, clientCert});
			return new Peer(this.peerUrl, opts);
		} else {
			// tls disabled
			return new Peer(this.peerUrl);
		}
	}
}

module.exports = PeerBuilder;