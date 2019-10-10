const logger = require('./logger').new('channel-config');
const fs = require('fs');
const agent = require('./agent2configtxlator');
const {JSONEqual} = require('khala-nodeutils/helper');

class ConfigFactory {
	constructor(original_config) {
		this.newConfig = JSON.parse(original_config);
	}

	static _toBase64(pem) {
		return fs.readFileSync(pem).toString('base64');
	}

	/**
	 * @param {string} MSPName
	 * @param nodeType
	 * @return {ConfigFactory}
	 */
	deleteMSP(MSPName, nodeType) {
		const target = ConfigFactory._getTarget(nodeType);
		delete this.newConfig.channel_group.groups[target].groups[MSPName];
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

	getOrg(MSPName, nodeType) {
		const target = ConfigFactory._getTarget(nodeType);
		return this.newConfig.channel_group.groups[target].groups[MSPName];
	}

	/**
	 * @param MSPName
	 * @param nodeType
	 * @param admin
	 * @return {ConfigFactory}
	 */
	addAdmin(MSPName, nodeType, admin) {
		if (!this.getOrg(MSPName, nodeType)) {
			logger.error(MSPName, 'not exist, addAdmin skipped');
			return this;
		}
		const target = ConfigFactory._getTarget(nodeType);
		const adminCert = fs.readFileSync(admin).toString('base64');
		const admins = this.newConfig.channel_group.groups[target].groups[MSPName].values.MSP.value.config.admins;
		if (admins.find(adminCert)) {
			logger.warn('adminCert found, addAdmin skipped');
			return this;
		}
		admins.push(adminCert);
		return this;
	}

	/**
	 * because we will not change the 'version' property, so it will never be totally identical
	 * @param MSPName
	 * @param MSPID
	 * @param nodeType
	 * @param {string[]} admins pem file path array
	 * @param {string[]} root_certs pem file path array
	 * @param {string[]} tls_root_certs pem file path array
	 * @return {ConfigFactory}
	 */
	createOrUpdateOrg(MSPName, MSPID, nodeType, {admins = [], root_certs = [], tls_root_certs = []} = {}, skipIfExist) {
		if (skipIfExist && this.getOrg(MSPName, nodeType)) {
			logger.info(MSPName, 'exist, createOrUpdateOrg skipped');
			return this;
		}
		const target = ConfigFactory._getTarget(nodeType);
		this.newConfig.channel_group.groups[target].groups[MSPName] = {
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
 * @param {Client.Peer} [peer] optional when nodeType is 'peer'
 * @param {boolean} [viaServer]
 *  true: This requires 'configtxlator' RESTful server running locally on port 7059
 *  false: use configtxlator as command line tool
 * @returns {Promise<{original_config_proto: Buffer, original_config: string|json}>}
 */
exports.getChannelConfigReadable = async (channel, peer, viaServer) => {
	let configEnvelope;
	if (peer) {
		configEnvelope = await channel.getChannelConfig(peer);
	} else {
		configEnvelope = await channel.getChannelConfigFromOrderer();
	}

	// NOTE JSON.stringify(original_config_proto) :TypeError: Converting circular structure to JSON
	const original_config_proto = configEnvelope.config.toBuffer();

	let original_config;
	if (viaServer) {
		const body = await agent.decode.config(original_config_proto);// body is a Buffer,
		original_config = JSON.stringify(JSON.parse(body));
	} else {
		const BinManager = require('./binManager');
		const binManager = new BinManager();
		original_config = await binManager.configtxlatorCMD.decode('common.Config', original_config_proto);
	}

	return {
		original_config_proto,
		original_config
	};
};
/**
 * @param {Client.Channel} channel with reader client
 * @param {Client.Orderer} orderer
 * @param {function} configChangeCallback input: {string|json} original_config, output {string|json} update_config
 * @param {function} signatureCollectCallback input: {Buffer<binary>} proto, output {Client.ConfigSignature[]} signatures
 * @param {Client} [client] tx committing client
 * @param {Client.Peer} [peer] optional when nodeType=='peer'
 * @param {boolean} [viaServer]
 */
exports.channelUpdate = async (channel, orderer, configChangeCallback, signatureCollectCallback,
	{peer, client = channel._clientContext, viaServer} = {}) => {

	const ERROR_NO_UPDATE = 'No update to original_config';
	const channelName = channel.getName();
	const {original_config_proto, original_config} = await exports.getChannelConfigReadable(channel, peer, viaServer);
	const updateConfigJSON = await configChangeCallback(original_config);
	if (JSONEqual(updateConfigJSON, original_config)) {
		logger.warn(ERROR_NO_UPDATE);
		return {err: ERROR_NO_UPDATE, original_config};
	}
	let modified_config_proto;
	if (viaServer) {
		const updatedProto = await agent.encode.config(updateConfigJSON);
		const formData = {
			channel: channelName,
			original: {
				value: original_config_proto,
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
		modified_config_proto = await binManager.configtxlatorCMD.computeUpdate(channelName, original_config_proto, updatedProto);
	}
	const proto = new Buffer(modified_config_proto, 'binary');
	const signatures = await signatureCollectCallback(proto);

	const request = {
		config: proto,
		signatures,
		name: channelName,
		orderer,
		txId: client.newTransactionID()
	};

	const updateChannelResp = await client.updateChannel(request);
	if (updateChannelResp.status !== 'SUCCESS') {
		throw Error(JSON.stringify(updateChannelResp));
	}
	logger.info('updateChannel', updateChannelResp);
	return updateChannelResp;
};


exports.ConfigFactory = ConfigFactory;
