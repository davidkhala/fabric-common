const logger = require('./logger').new('channel-config');
const fs = require('fs');
const agent = require('./agent2configtxlator');
const {JSONEqual} = require('khala-nodeutils/helper');
const {signs} = require('./multiSign');
/**
 * @typedef {string} OrgName organization name (MSPName), mapping to MSP ID
 */

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
	 * @param nodeType
	 * @return {ConfigFactory}
	 */
	deleteMSP(OrgName, nodeType) {
		const target = ConfigFactory._getTarget(nodeType);
		delete this.newConfig.channel_group.groups[target].groups[OrgName];
		return this;
	}

	static _getTarget(nodeType) {
		let target;
		switch (nodeType) {
			case 'orderer':
				target = 'Orderer';
				break;
			case 'peer':
				target = 'Application';
				break;
			default:
				throw Error(`invalid nodeType ${nodeType}`);
		}
		return target;
	}

	assignDictator(MSPID, nodeType) {
		const target = ConfigFactory._getTarget(nodeType);
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

	getOrg(OrgName, nodeType) {
		const target = ConfigFactory._getTarget(nodeType);
		return this.newConfig.channel_group.groups[target].groups[OrgName];
	}

	/**
	 * @param {string} OrgName
	 * @param nodeType
	 * @param admin
	 * @return {ConfigFactory}
	 */
	addAdmin(OrgName, nodeType, admin) {
		if (!this.getOrg(OrgName, nodeType)) {
			logger.error(OrgName, 'not exist, addAdmin skipped');
			return this;
		}
		const target = ConfigFactory._getTarget(nodeType);
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
	 * @param MSPID
	 * @param nodeType
	 * @param {string[]} admins pem file path array
	 * @param {string[]} root_certs pem file path array
	 * @param {string[]} tls_root_certs pem file path array
	 * @return {ConfigFactory}
	 */
	createOrUpdateOrg(OrgName, MSPID, nodeType, {admins = [], root_certs = [], tls_root_certs = []} = {}, skipIfExist) {
		if (skipIfExist && this.getOrg(OrgName, nodeType)) {
			logger.info(OrgName, 'exist, createOrUpdateOrg skipped');
			return this;
		}
		const target = ConfigFactory._getTarget(nodeType);
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
	 * @param {string} type kafka|etcdraft
	 */
	setConsensusType(type) {
		switch (type) {
			case 'kafka':
				this.newConfig.channel_group.groups.Orderer.values.ConsensusType.value.type = type;
				break;
			case 'etcdraft':
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
		// TODO https://jira.hyperledger.org/browse/FAB-16756
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
		channel.addOrderer(orderer);
		configEnvelope = await channel.getChannelConfigFromOrderer();
	}

	// NOTE JSON.stringify(configProto) :TypeError: Converting circular structure to JSON
	const configProto = configEnvelope.config.toBuffer();

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
 * @returns {Promise<Client.BroadcastResponse>}
 */
exports.channelUpdate = async (channel, orderer, configChangeCallback, signatureCollectCallback,
	{peer, client = channel._clientContext, viaServer} = {}, {config, signatures} = {}) => {

	const channelName = channel.getName();
	if (!config) {
		const ERROR_NO_UPDATE = 'No update to original_config';

		const {configProto, configJSON} = await exports.getChannelConfigReadable(channel, {peer, orderer}, viaServer);
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
		config = new Buffer(modified_config_proto, 'binary');
	}
	if (!signatures) {
		signatures = await signatureCollectCallback(config);
	}

	/**
	 * @type {ChannelRequest}
	 */
	const request = {
		config,
		signatures,
		name: channelName,
		orderer,
		txId: client.newTransactionID()
	};

	const updateChannelResp = await client.updateChannel(request);
	if (updateChannelResp.status !== 'SUCCESS') {
		throw Object.assign(Error('Error: channel update'), updateChannelResp);
	}
	logger.info(`[${channelName}] channel update: ${updateChannelResp}`);
	return updateChannelResp;
};


exports.ConfigFactory = ConfigFactory;


/**
 * setup anchorPeers from anchorPeerTxFile, this could only be done once.
 * @param {Client.Channel} channel
 * @param {string} anchorPeerTxFile filePath
 * @param {Client.Orderer} orderer
 * @param {Client[]} [signers]
 * @param client
 * @returns {Promise<BroadcastResponse>}
 */
exports.setupAnchorPeers = async (channel, orderer, anchorPeerTxFile,
	signers = [channel._clientContext], {client = channel._clientContext} = {}) => {
	const channelConfig_envelop = fs.readFileSync(anchorPeerTxFile);
	const config = channel._clientContext.extractChannelConfig(channelConfig_envelop);// this is
	const signatures = signs(signers, config);

	return await exports.channelUpdate(channel, orderer, undefined, undefined, {client}, {config, signatures});
};
exports.setAnchorPeers = async (channel, orderer, OrgName, anchorPeers,
	signers = [channel._clientContext], {peer, client = channel._clientContext, viaServer} = {}) => {

	const configChangeCallback = (original_config) => {
		const configFactory = new ConfigFactory(original_config);
		configFactory.setAnchorPeers(OrgName, anchorPeers);
		return configFactory.build();
	};
	const signatureCollectCallback = (config) => {
		return signs(signers, config);
	};
	return await exports.channelUpdate(channel, orderer, configChangeCallback, signatureCollectCallback, {peer, client, viaServer});
};
