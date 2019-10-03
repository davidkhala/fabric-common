const logger = require('./logger').new('configtxlator');
const Tmp = require('tmp');
const fs = require('fs');
const agent = require('./agent2configtxlator');
const {JSONEqual} = require('khala-nodeutils/helper');


//TODO [1.4.1] configtxlator has now more commands:
//  proto_encode --type=TYPE [<flags>]
//     Converts a JSON document to protobuf.
//
//   proto_decode --type=TYPE [<flags>]
//     Converts a proto message to JSON.
//
//   compute_update --channel_id=CHANNEL_ID [<flags>]
//     Takes two marshaled common.Config messages and computes the config update which transitions between the two.


class ConfigFactory {
	constructor(original_config) {
		this.newConfig = JSON.parse(original_config);
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
							admins: admins.map(admin => {
								return fs.readFileSync(admin).toString('base64');
							}),
							crypto_config: {
								identity_identifier_hash_function: 'SHA256',
								signature_hash_family: 'SHA2'
							},
							name: MSPID,
							root_certs: root_certs.map(rootCert => {
								return fs.readFileSync(rootCert).toString('base64');
							}),
							tls_root_certs: tls_root_certs.map(tlsRootCert => {
								return fs.readFileSync(tlsRootCert).toString('base64');
							})
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
 * @param channel
 * @param {Peer} [peer] optional when nodeType is 'peer'
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
 * @param {Channel} channel
 * @param {Orderer} orderer
 * @param {function} configChangeCallback input: {string|json} original_config, output {string|json} update_config
 * @param {function} signatureCollectCallback input: {Buffer<binary>} proto, output {Client.ConfigSignature[]} signatures
 * @param {Client} [client]
 * @param {Peer} [peer] optional when nodeType=='peer'
 * @param {boolean} [viaServer]
 */
exports.channelUpdate = async (channel, orderer, configChangeCallback, signatureCollectCallback,
	{peer, client = channel._clientContext, viaServer} = {}) => {

	const ERROR_NO_UPDATE = 'No update to original_config';
	const {original_config_proto, original_config} = await exports.getChannelConfigReadable(channel, peer, viaServer);
	const updateConfigJSON = await configChangeCallback(original_config);
	if (JSONEqual(updateConfigJSON, original_config)) {
		logger.warn(ERROR_NO_UPDATE);
		return {err: ERROR_NO_UPDATE, original_config};
	}
	let proto;
	if (viaServer) {
		const updatedProto = await agent.encode.config(updateConfigJSON);
		const formData = {
			channel: channel.getName(),
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
		const body2 = await agent.compute.updateFromConfigs(formData);
		if (!body2) {
			logger.warn(ERROR_NO_UPDATE, '(calculated from configtxlator)');
			return {err: ERROR_NO_UPDATE, original_config};
		}
		proto = new Buffer(body2, 'binary');
	} else {
		const BinManager = require('./binManager');
		const binManager = new BinManager();

		const updatedProto = await binManager.configtxlatorCMD.encode('common.Config', updateConfigJSON);
		//TODO WIP

	}
	const signatures = await signatureCollectCallback(proto);

	const request = {
		config: proto,
		signatures,
		name: channel.getName(),
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
