const fs = require('fs');
const {RemoteOptsTransform} = require('khala-fabric-formatter/remote');
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
		const {endpoint} = committer;
		const eventer = new Eventer(endpoint.url, {}, undefined);
		eventer.serviceClass = committer.serviceClass;
		eventer.setEndpoint(endpoint);
		this.eventer = eventer;
		this.logger = logger;
	}

	async connect() {
		const {logger} = this;
		try {
			await this.committer.connect();
		} catch (e) {
			const {message} = e;
			if (message === `This service endpoint ${this.committer.name}-${this.committer.endpoint.url} is connected` ||
				message === `This service endpoint ${this.committer.name}-${this.committer.endpoint.url} has an active grpc service connection`) {
				logger.info(`${this.committer.name} connection exist already`);
			} else {
				throw e;
			}
		}
	}

	close() {
		this.committer.disconnect();
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
	 * TODO why do we need this._sendDeliverConnect
	 * Send a Deliver message to the orderer service.
	 *
	 * @param {Buffer} envelope - Byte data to be included in the broadcast. This must be a protobuf encoded byte array of the
	 *                            [common.Envelope] that contains a [SeekInfo] in the <code>payload.data</code> property of the envelope.
	 *                            The <code>header.channelHeader.type</code> must be set to [common.HeaderType.DELIVER_SEEK_INFO]
	 * @param timeout
	 * @returns {Promise<Block[]>}
	 */
	async sendDeliver(envelope, timeout) {

		const {logger} = this;
		const loggerPrefix = `${this.committer.name} sendDeliver`;
		timeout = timeout || this.committer.options.requestTimeout;


		// Send the seek info to the orderer via grpc
		return new Promise((resolve, reject) => {
			const deliver = this.committer.service.deliver();
			const responses = [];
			let error_msg = 'SYSTEM_TIMEOUT';

			const deliver_timeout = setTimeout(() => {
				logger.debug(loggerPrefix, `timed out after:${timeout}`);
				deliver.end();
				return reject(new Error(error_msg));
			}, timeout);
			deliver.on('data', (response) => {
				logger.debug('sendDeliver - on data');

				switch (response.Type) {
					case 'block': {
						const {block} = response;

						logger.debug(loggerPrefix, `received block[${block.header.number}]`);
						responses.push(block);
					}
						break;
					case 'status': {
						deliver.end();
						if (response.status === 'SUCCESS') {
							logger.debug(loggerPrefix, `resolve - status:${response.status}`);
							return resolve(responses);
						} else {
							logger.error(loggerPrefix, `rejecting - status:${response.status}`);
							const err = Object.assign(Error('Invalid results returned'), response);
							return reject(err);
						}
					}
					//  break;
					default:
						logger.error(loggerPrefix, `assertion ERROR - invalid response.Type=[${response.Type}]`);
						deliver.end();
						return reject(new Error('SYSTEM_ERROR'));
				}
			});

			deliver.on('status', (response) => {
				logger.debug(loggerPrefix, 'on status', response);
			});

			deliver.on('end', () => {
				clearTimeout(deliver_timeout);
				deliver.cancel();
				logger.debug(loggerPrefix, 'on end');

			});

			deliver.on('error', (err) => {
				logger.debug(loggerPrefix, 'on error');
				deliver.end();
				if (err.code === 14) {
					err.originalMessage = err.message;
					err.message = 'SERVICE_UNAVAILABLE';
				}
				return reject(err);
			});

			deliver.write(envelope);
			error_msg = 'REQUEST_TIMEOUT';
			logger.debug(loggerPrefix, 'sent envelope');
		});
	}

	toString() {
		return this.committer.toString();
	}
}

module.exports = Orderer;