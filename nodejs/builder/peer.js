const Peer = require('fabric-client/lib/Peer');
const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');

class PeerManager {
	/**
	 * @param {intString|integer} peerPort
	 * @param {SSLTargetNameOverride} [peerHostName]
	 * @param {string} [cert] TLS CA certificate file path
	 * @param {CertificatePem} [pem] TLS CA certificate
	 * @param {string} [host]
	 * @param {ClientKey} [clientKey]
	 * @param {ClientCert} [clientCert]
	 * @param {Client.Peer} [peer] - apply for existing peer object
	 */
	constructor({peerPort, peerHostName, cert, pem, host, clientKey, clientCert}, peer) {
		if (!peer) {
			if (!pem) {
				if (fs.existsSync(cert)) {
					pem = fs.readFileSync(cert).toString();
				}
			}

			this.host = host ? host : (peerHostName ? peerHostName : 'localhost');
			this.port = peerPort;
			if (pem) {
				// tls enabled
				const url = `grpcs://${this.host}:${peerPort}`;
				this.pem = pem;
				this.sslTargetNameOverride = peerHostName;
				this.clientKey = clientKey;
				this.clientCert = clientCert;
				const opts = RemoteOptsTransform({
					host: this.host,
					pem,
					sslTargetNameOverride: peerHostName,
					clientKey,
					clientCert
				});
				peer = new Peer(url, opts);
			} else {
				// tls disabled
				const url = `grpc://${this.host}:${peerPort}`;
				peer = new Peer(url);
			}
		}

		this.peer = peer;
	}

	/**
	 * basic health check by discoveryClient
	 * @param {Peer} peer
	 * @return {Promise<boolean>} false if connect trial failed
	 */
	static async ping(peer) {
		try {
			await peer.waitForReady(peer._discoveryClient);
			peer._discoveryClient.close();
			return true;
		} catch (err) {
			if (err.message.includes('Failed to connect before the deadline')) {
				return false;
			} else {
				throw err;
			}
		}
	}

	close() {
		this.peer.close();
	}

	reconnect() {
		this.peer._createClients();
	}

	async ping() {
		return await PeerManager.ping(this.peer);
	}
}

module.exports = PeerManager;