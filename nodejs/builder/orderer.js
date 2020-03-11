const Orderer = require('fabric-client/lib/Orderer');
const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');
const ProtoLoader = require('./protobuf');

class OrdererManager {
	/**
	 * @param {intString|integer} ordererPort
	 * @param {string} [cert] TLS CA certificate file path
	 * @param {CertificatePem} [pem] TLS CA certificate
	 * @param {SSLTargetNameOverride} [ordererHostName]
	 * @param {string} [host]
	 * @param {ClientKey} [clientKey]
	 * @param {ClientCert} [clientCert]
	 * @param {Orderer} orderer
	 */
	constructor({ordererPort, cert, pem, ordererHostName, host, clientKey, clientCert} = {}, orderer) {
		if (!orderer) {
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
				orderer = OrdererManager.build(url, {
					host: this.host,
					pem,
					sslTargetNameOverride: ordererHostName,
					clientKey,
					clientCert,
				});
			} else {
				// tls disabled
				const url = `grpc://${this.host}:${ordererPort}`;
				orderer = OrdererManager.build(url);
			}
		}
		this.orderer = orderer;
	}

	static build(url, rawOpts) {
		const opts = rawOpts ? RemoteOptsTransform(rawOpts) : undefined;
		return new Orderer(url, opts);
	}

	/**
	 * basic health check for an orderer
	 * @param {Orderer} orderer
	 */
	static async ping(orderer) {
		try {
			await orderer.waitForReady(orderer._ordererClient);
			return true;
		} catch (err) {
			if (err.message.includes('Failed to connect before the deadline')) {
				return false;
			} else {
				throw err;
			}
		}
	}

	static createClient(orderer, node_modules) {
		const protobufLoader = new ProtoLoader(node_modules);
		const _abProto = protobufLoader.require('protos/orderer/ab.proto').orderer;
		orderer._ordererClient = new _abProto.AtomicBroadcast(orderer._endpoint.addr, orderer._endpoint.creds, orderer._options);
	}

	close() {
		// TODO fabric-sdk provide a way to reconnect on existing client
		this.orderer._ordererClient.close();
		this.orderer._ordererClient = null;
	}

	async ping() {
		return await OrdererManager.ping(this.orderer);
	}
}

module.exports = OrdererManager;