const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');
const {DeliverResponseStatus: {SUCCESS, NOT_FOUND}, DeliverResponseType: {FULL_BLOCK, STATUS}} = require('khala-fabric-formatter/eventHub');
const EndPoint = require('fabric-common/lib/Endpoint');
const Committer = require('fabric-common/lib/Committer');
const Eventer = require('fabric-common/lib/Eventer');

class Orderer {
	/**
	 * @param {intString|integer} ordererPort
	 * @param {string} [cert] TLS CA certificate file path
	 * @param {CertificatePem} [pem] TLS CA certificate
	 * @param {SSLTargetNameOverride} [ordererHostName]
	 * @param {string} [host]
	 * @param {ClientKey} [clientKey]
	 * @param {ClientCert} [clientCert]
	 * @param {Committer} committer
	 * @param logger
	 */
	constructor({ordererPort, cert, pem, ordererHostName, host, clientKey, clientCert} = {}, committer, logger = console) {
		if (!committer) {
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
			const endpoint = new EndPoint(options);
			committer = new Committer(endpoint.url, null, undefined);
			committer.setEndpoint(endpoint);
		}

		this.committer = committer;

		const {endpoint, serviceClass} = committer;
		const eventer = new Eventer(endpoint.url, {}, undefined);
		eventer.serviceClass = serviceClass;
		eventer.setEndpoint(endpoint);
		this.eventer = eventer;
		this.logger = logger;
	}

	reset() {
		this.eventer.connectAttempted = false;
		this.committer.connectAttempted = false;
	}

	async connect() {
		const {logger} = this;
		if (this.committer.connected || this.committer.service) {
			logger.info(`${this.committer.name} connection exist already`);
		} else {
			await this.committer.connect();
		}
		if (this.eventer.connected || this.eventer.service) {
			logger.info(`${this.eventer.name} connection exist already`);
		} else {
			await this.eventer.connect();
		}
	}

	disconnect() {
		this.committer.disconnect();
		this.eventer.disconnect();
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


	/**
	 * Send a Deliver message to the orderer service.
	 *
	 * @param {{signature:Buffer, payload:Buffer}} envelope
	 * @param [timeout]
	 * @returns {Promise<Block[]>}
	 */
	async sendDeliver(envelope, timeout) {
		const {logger} = this;
		const loggerPrefix = `${this.committer.name} sendDeliver`;
		timeout = timeout || this.committer.options.requestTimeout;


		// Send the seek info to the orderer via grpc
		return new Promise((resolve, reject) => {
			const stream = this.committer.service.deliver();
			const responses = [];
			let error_msg = 'SYSTEM_TIMEOUT';

			const deliver_timeout = setTimeout(() => {
				logger.debug(loggerPrefix, `timed out after:${timeout}`);
				stream.end();
				return reject(new Error(error_msg));
			}, timeout);
			stream.on('data', (response) => {
				// DeliverFiltered, DeliverWithPrivateData is designed for peer only
				switch (response.Type) {
					case FULL_BLOCK: {
						const {block} = response;

						logger.debug(loggerPrefix, `received block[${block.header.number}]`);
						responses.push(block);
					}
						break;
					case STATUS: {
						stream.end();
						switch (response.status) {
							case SUCCESS:
								return resolve(responses);
							case NOT_FOUND:
							default: {
								logger.error(loggerPrefix, `rejecting - status:${response.status}`);
								const err = Object.assign(Error('Invalid status returned'), response);
								return reject(err);
							}
						}

					}
					//  break;
					default:
						logger.error(loggerPrefix, `assertion ERROR - invalid response.Type=[${response.Type}]`);
						stream.end();
						return reject(new Error('SYSTEM_ERROR'));
				}
			});

			stream.on('status', (response) => {
				logger.debug(loggerPrefix, 'on status', response);
			});

			stream.on('end', () => {
				clearTimeout(deliver_timeout);
				stream.cancel();
				logger.debug(loggerPrefix, 'on end');

			});

			stream.on('error', (err) => {
				logger.debug(loggerPrefix, 'on error');
				stream.end();
				if (err.code === 14) {
					err.originalMessage = err.message;
					err.message = 'SERVICE_UNAVAILABLE';
				}
				return reject(err);
			});

			stream.write(envelope);
			error_msg = 'REQUEST_TIMEOUT';
		});
	}

	toString() {
		return JSON.stringify({Orderer: this.committer.endpoint.url});
	}
}

module.exports = Orderer;