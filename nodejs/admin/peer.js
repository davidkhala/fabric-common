const EndPoint = require('fabric-common/lib/Endpoint');
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


		// const opts = RemoteOptsTransform({host, pem, sslTargetNameOverride, clientKey, clientCert}); // TODO


		const options = {
			url: peerUrl,
			pem, clientKey, clientCert
		};
		this.endPoint = new EndPoint(options);
	}

	isTLS() {
		return !!this.pem;
	}
}

Peer.container = {
	MSPROOT: '/etc/hyperledger/crypto-config',
	dockerSock: '/host/var/run/docker.sock',
	state: '/var/hyperledger/production',
	config: '/etc/hyperledger/'
};


module.exports = Peer;