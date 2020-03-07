const fs = require('fs');
// const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');
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
		// const opts = RemoteOptsTransform({host, pem, sslTargetNameOverride, clientKey, clientCert}); // TODO
		const options = {
			url: ordererUrl,
			pem, clientKey, clientCert
		};
		this.endpoint = new EndPoint(options);
	}

	build(client, mspId) {
		return new Committer(this.endpoint.url, client, mspId);
	}
}

module.exports = Orderer;