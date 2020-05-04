const logger = require('khala-logger/log4js').consoleLogger('channel-config');
const fs = require('fs');
const agent = require('./agent2configtxlator');
const {JSONEqual} = require('khala-nodeutils/helper');
const {signChannelConfig} = require('./multiSign');
const {ChannelType} = require('./constants');
const {OrdererType} = require('khala-fabric-formatter/constants');

/**
 * @callback configChangeCallback
 * @param {string|json} original_config
 * @return {string|json} update_config
 */

/**
 * @callback signatureCollectCallback
 * @param {Buffer<binary>} config
 * @return {Client.ConfigSignature[]} signatures
 */

/**
 * @class ConfigFactory
 */
class ConfigFactory {
	/**
	 * @param {string|json} original_config
	 */
	constructor(original_config) {
		this.newConfig = JSON.parse(original_config);
	}

	static _toBase64(pem) {
		return fs.readFileSync(pem).toString('base64');
	}

	/**
	 * @param {OrgName} OrgName
	 * @param {ChannelType} channelType
	 * @return {ConfigFactory}
	 */
	deleteMSP(OrgName, channelType) {
		const target = ConfigFactory._getTarget(channelType);
		delete this.newConfig.channel_group.groups[target].groups[OrgName];
		return this;
	}

	/**
	 *
	 * @param {ChannelType} type
	 * @return {string}
	 * @private
	 */
	static _getTarget(type) {
		let target;
		switch (type) {
			case ChannelType.system:
				target = 'Orderer';
				break;
			case ChannelType.application:
				target = 'Application';
				break;
			default:
				throw Error(`invalid channel type ${type}`);
		}
		return target;
	}

	/**
	 *
	 * @param {MspId} MSPID
	 * @param {ChannelType} channelType
	 * @return {ConfigFactory}
	 */
	assignDictator(MSPID, channelType) {
		const target = ConfigFactory._getTarget(channelType);
		this.newConfig.channel_group.groups[target].policies.Admins.policy = {
			type: 1,
			value: {
				identities: [
					{
						principal: {
							msp_identifier: MSPID,
							role: 'ADMIN'
						},
						principal_classification: 'ROLE'
					}
				],
				rule: {
					n_out_of: {
						n: 1,
						rules: [
							{
								signed_by: 0
							}
						]
					}
				}
			}
		};
		return this;
	}

	/**
	 *
	 * @param OrgName
	 * @param {ChannelType} channelType
	 */
	getOrg(OrgName, channelType) {
		const target = ConfigFactory._getTarget(channelType);
		return this.newConfig.channel_group.groups[target].groups[OrgName];
	}

	/**
	 * @param {string} OrgName
	 * @param {ChannelType} channelType
	 * @param admin
	 * @return {ConfigFactory}
	 */
	addAdmin(OrgName, channelType, admin) {
		if (!this.getOrg(OrgName, channelType)) {
			logger.error(OrgName, 'not exist, addAdmin skipped');
			return this;
		}
		const target = ConfigFactory._getTarget(channelType);
		const adminCert = fs.readFileSync(admin).toString('base64');
		const admins = this.newConfig.channel_group.groups[target].groups[OrgName].values.MSP.value.config.admins;
		if (admins.find(adminCert)) {
			logger.warn('adminCert found, addAdmin skipped');
			return this;
		}
		admins.push(adminCert);
		return this;
	}

	getAnchorPeers(OrgName) {
		return this.newConfig.channel_group.groups.Application.groups[OrgName].values.AnchorPeers;
	}

	/**
	 * @param {string} OrgName
	 * @param {[{host:string,port:number}]} anchorPeers
	 */
	setAnchorPeers(OrgName, anchorPeers) {
		anchorPeers = anchorPeers.map(({host, port}) => ({host: host.toString(), port}));
		const {AnchorPeers} = this.newConfig.channel_group.groups.Application.groups[OrgName].values;
		if (AnchorPeers) {
			AnchorPeers.value.anchor_peers = anchorPeers;
		} else {
			this.newConfig.channel_group.groups.Application.groups[OrgName].values.AnchorPeers = {
				mod_policy: 'Admins',
				value: {
					anchor_peers: anchorPeers
				},
				version: '0'
			};
		}
		return this;
	}

	/**
	 * because we will not change the 'version' property, so it will never be totally identical
	 * @param {OrgName} OrgName
	 * @param {MspId} MSPID
	 * @param {ChannelType} channelType
	 * @param {string[]} admins pem file path array
	 * @param {string[]} root_certs pem file path array
	 * @param {string[]} tls_root_certs pem file path array
	 * @param skipIfExist
	 * @return {ConfigFactory}
	 */
	createOrUpdateOrg(OrgName, MSPID, channelType, {admins = [], root_certs = [], tls_root_certs = []} = {}, skipIfExist) {
		if (skipIfExist && this.getOrg(OrgName, channelType)) {
			logger.info(OrgName, 'exist, createOrUpdateOrg skipped');
			return this;
		}
		const target = ConfigFactory._getTarget(channelType);
		this.newConfig.channel_group.groups[target].groups[OrgName] = {
			mod_policy: 'Admins',
			policies: {
				Admins: {
					mod_policy: 'Admins',
					policy: {
						type: 1,
						value: {
							identities: [
								{
									principal: {
										msp_identifier: MSPID,
										role: 'ADMIN'
									},
									principal_classification: 'ROLE'
								}
							],
							rule: {
								n_out_of: {
									n: 1,
									rules: [
										{
											signed_by: 0
										}
									]
								}
							}
						}
					}
				},
				Readers: {
					mod_policy: 'Admins',
					policy: {
						type: 1,
						value: {
							identities: [
								{
									principal: {
										msp_identifier: MSPID,
										role: 'MEMBER'
									},
									principal_classification: 'ROLE'
								}
							],
							rule: {
								n_out_of: {
									n: 1,
									rules: [
										{
											signed_by: 0
										}
									]
								}
							}
						}
					}
				},
				Writers: {
					mod_policy: 'Admins',
					policy: {
						type: 1,
						value: {
							identities: [
								{
									principal: {
										msp_identifier: MSPID,
										role: 'MEMBER'
									},
									principal_classification: 'ROLE'
								}
							],
							rule: {
								n_out_of: {
									n: 1,
									rules: [
										{
											signed_by: 0
										}
									]
								}
							}
						}
					}
				}
			},
			values: {
				MSP: {
					mod_policy: 'Admins',
					value: {
						config: {
							admins: admins.map(ConfigFactory._toBase64),
							crypto_config: {
								identity_identifier_hash_function: 'SHA256',
								signature_hash_family: 'SHA2'
							},
							name: MSPID,
							root_certs: root_certs.map(ConfigFactory._toBase64),
							tls_root_certs: tls_root_certs.map(ConfigFactory._toBase64)
						},
						type: 0
					}
				}
			}

		};
		return this;
	}

	/**
	 *
	 * @param {string} version
	 * @return {string}
	 * @private
	 */
	static _fromSemVer(version) {
		return `V${version.replace('.', '_')}`;
	}

	setCapability(version) {
		const {Capabilities} = this.newConfig.channel_group.groups.Orderer.values;
		if (!Capabilities) {
			this.newConfig.channel_group.groups.Orderer.values.Capabilities = {
				mod_policy: 'Admins',
				value: {
					capabilities: {
						[ConfigFactory._fromSemVer(version)]: {}
					}
				}
			};
		} else {
			Capabilities.value.capabilities = {
				[ConfigFactory._fromSemVer(version)]: {}
			};
		}
		return this;
	}

	/**
	 * @param newAddr
	 * @return {ConfigFactory}
	 */
	addOrdererAddress(newAddr) {
		if (!this.newConfig.channel_group.values.OrdererAddresses.value.addresses.includes(newAddr)) {
			this.newConfig.channel_group.values.OrdererAddresses.value.addresses.push(newAddr);
		} else {
			logger.info(newAddr, 'exist, addOrdererAddress skipped');
		}
		return this;
	}

	getOrdererAddresses() {
		return this.newConfig.channel_group.values.OrdererAddresses.value.addresses;
	}

	getKafkaBrokers() {
		return this.newConfig.channel_group.groups.Orderer.values.KafkaBrokers.value.brokers;
	}

	/**
	 *
	 * @param {OrdererType} type
	 */
	setConsensusType(type) {
		switch (type) {
			case OrdererType.kafka:
				this.newConfig.channel_group.groups.Orderer.values.ConsensusType.value.type = type;
				break;
			case OrdererType.etcdraft:
				this.newConfig.channel_group.groups.Orderer.values.ConsensusType.value.type = type;
				delete this.newConfig.channel_group.groups.Orderer.values.KafkaBrokers;
				break;
			default:
				throw Error(`Unsupported ConsensusType ${type}`);
		}
		return this;
	}

	setConsensusMetadata(consenters, options) {
		const {metadata} = this.newConfig.channel_group.groups.Orderer.values.ConsensusType.value;
		if (metadata) {
			if (options) {
				metadata.options = options;
			}
			if (consenters) {
				metadata.consenters = consenters;
			}
		} else {
			if (!options) {
				options = {
					election_tick: 10,
					heartbeat_tick: 1,
					max_inflight_blocks: 5,
					snapshot_interval_size: 20971520,
					tick_interval: '500ms'
				};
			}
			this.newConfig.channel_group.groups.Orderer.values.ConsensusType.value.metadata = {
				consenters: consenters.map(({client_tls_cert, host, port = 7050, server_tls_cert}) => ({
					client_tls_cert: ConfigFactory._toBase64(client_tls_cert),
					server_tls_cert: ConfigFactory._toBase64(server_tls_cert),
					host, port: parseInt(port)
				})),
				options
			};
		}
		return this;
	}

	/**
	 * setting the ordering service into maintenance mode
	 * @param isDirectionIn true to setting the ordering service into maintenance mode, false to back to normal mode
	 * @return {ConfigFactory}
	 */
	maintenanceMode(isDirectionIn) {
		this.newConfig.channel_group.groups.Orderer.values.ConsensusType.value.state = isDirectionIn ? 'STATE_MAINTENANCE' : 'STATE_NORMAL';
		return this;
	}

	build() {
		return JSON.stringify(this.newConfig);
	}
}

/**
 * Note that it could be used to extract application channel from orderer
 * @param {Client.Channel} channel
 * @param {Client.Peer} [peer] targeted peer from which we fetch block
 * @param {Client.Orderer} [orderer] targeted orderer from which we fetch block
 * @param {boolean} [viaServer]
 *  true: This requires 'configtxlator' RESTFul server running locally on port 7059
 *  false: use 'configtxlator' as command line tool
 * @returns {Promise<{configProto: Buffer, configJSON: string|json}>}
 */
exports.getChannelConfigReadable = async (channel, {peer, orderer}, viaServer) => {
	let configEnvelope;
	if (peer) {
		configEnvelope = await channel.getChannelConfig(peer);
	} else {
		channel._orderers = new Map();
		channel._orderers.set(orderer.getName(), orderer);
		configEnvelope = await channel.getChannelConfigFromOrderer();
	}

	const configProto = configEnvelope.config.toBuffer(); // it has circular structure

	let configJSON;
	if (viaServer) {
		const body = await agent.decode.config(configProto);// body is a Buffer,
		configJSON = JSON.stringify(JSON.parse(body));
	} else {
		const BinManager = require('./binManager');
		const binManager = new BinManager();
		configJSON = await binManager.configtxlatorCMD.decode('common.Config', configProto);
	}

	return {
		configProto,
		configJSON
	};
};

/**
 * take effect in next block, it is recommended to register a block event after
 * @param {Client.Channel} channel with reader client
 * @param {Client.Orderer} orderer
 * @param {configChangeCallback} [configChangeCallback]
 * @param {signatureCollectCallback} [signatureCollectCallback]
 * @param {Client} [client] tx committing client
 * @param {Client.Peer} [peer]
 * @param {boolean} [viaServer]
 * @param {Buffer<binary>} [config]
 * @param {Client.ConfigSignature[]} [signatures]
 * @param {Buffer} [envelope] A signed channel update config as a encoded grpc message. An example is output of `peer channel signconfigtx`
 * @returns {Promise<Client.BroadcastResponse>}
 */
exports.channelUpdate = async (channel, orderer, configChangeCallback, signatureCollectCallback, {peer, client, viaServer} = {}, {config, signatures, envelope} = {}) => {

	if (!client) {
		client = channel._clientContext;
	}
	const channelName = channel.getName();

	/**
	 * @type {ChannelRequest}
	 */
	const request = {
		name: channelName,
		orderer,
		txId: client.newTransactionID()
	};

	if (!envelope) {
		if (!config) {
			const ERROR_NO_UPDATE = 'No update to original_config';

			const {configProto, configJSON} = await exports.getChannelConfigReadable(channel, {
				peer,
				orderer
			}, viaServer);
			const updateConfigJSON = await configChangeCallback(configJSON);
			if (JSONEqual(updateConfigJSON, configJSON)) {
				logger.warn(ERROR_NO_UPDATE);
				return {status: ERROR_NO_UPDATE, info: updateConfigJSON};
			}
			let modified_config_proto;
			if (viaServer) {
				const updatedProto = await agent.encode.config(updateConfigJSON);
				const formData = {
					channel: channelName,
					original: {
						value: configProto,
						options: {
							filename: 'original.proto',
							contentType: 'application/octet-stream'
						}
					},
					updated: {
						value: updatedProto,
						options: {
							filename: 'updated.proto',
							contentType: 'application/octet-stream'
						}
					}
				};
				modified_config_proto = await agent.compute.updateFromConfigs(formData);
			} else {
				const BinManager = require('./binManager');
				const binManager = new BinManager();

				const updatedProto = await binManager.configtxlatorCMD.encode('common.Config', updateConfigJSON);
				modified_config_proto = await binManager.configtxlatorCMD.computeUpdate(channelName, configProto, updatedProto);
			}
			config = Buffer.from(modified_config_proto, 'binary');
		}
		if (!signatures) {
			signatures = await signatureCollectCallback(config);
		}
		request.config = config;
		request.signatures = signatures;
	} else {
		request.envelope = envelope;
	}


	const updateChannelResp = await client.updateChannel(request);

	if (updateChannelResp.status !== 'SUCCESS') {
		logger.error(updateChannelResp);
		throw Object.assign(Error('Channel update'), updateChannelResp);
	}
	logger.info(`[${channelName}] channel update: ${JSON.stringify(updateChannelResp)}`);
	return updateChannelResp;
};

exports.ConfigFactory = ConfigFactory;

exports.setAnchorPeers = async (channel, orderer, OrgName, anchorPeers, signers, {peer, client, viaServer} = {}) => {

	if (!signers) {
		signers = [channel._clientContext];
	}
	if (!client) {
		client = channel._clientContext;
	}
	const configChangeCallback = (original_config) => {
		const configFactory = new ConfigFactory(original_config);
		configFactory.setAnchorPeers(OrgName, anchorPeers);
		return configFactory.build();
	};
	const signatureCollectCallback = (config) => {
		return signChannelConfig(signers, config);
	};
	return await exports.channelUpdate(channel, orderer, configChangeCallback, signatureCollectCallback, {
		peer,
		client,
		viaServer
	});
};
