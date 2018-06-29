const logger = require('./logger').new('configtxlator');

const fs = require('fs');
const agent = require('./agent2configtxlator');
const OrdererUtil = require('./orderer');
const EventHubUtil = require('./eventHub');
const {JSONEqual} = require('./helper');
exports.ConfigFactory = class {
	constructor(original_config) {
		this.newConfig = JSON.parse(original_config);
	}

	deleteMSP(MSPName, nodeType) {
		const target = this._getTarget(nodeType);
		delete this.newConfig.channel_group.groups[target].groups[MSPName];
		return this;
	}

	_getTarget(nodeType) {
		let target;
		if (nodeType === 'orderer') target = 'Orderer';
		if (nodeType === 'peer') target = 'Application';
		if (!target) throw `invalid nodeType ${nodeType}`;
		return target;
	}

	assignDictator(MSPID, nodeType) {
		const target = this._getTarget(nodeType);
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
				},
			}
		};
		return this;
	}

	getOrg(MSPName, nodeType) {
		const target = this._getTarget(nodeType);
		return this.newConfig.channel_group.groups[target].groups[MSPName];
	}

	addAdmin(MSPName, nodeType, admin) {
		if (!this.getOrg(MSPName, nodeType)) {
			logger.error(MSPName, 'not exist, addAdmin skipped');
			return this;
		}
		const target = this._getTarget(nodeType);
		const adminCert = fs.readFileSync(admin).toString('base64');
		const admins = this.newConfig.channel_group.groups[target].groups[MSPName].values.MSP.value.config.admins;
		if (admins.find(adminCert)){
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
	 */
	createOrUpdateOrg(MSPName, MSPID, nodeType, {admins = [], root_certs = [], tls_root_certs = []} = {}, skipIfExist) {
		if (skipIfExist && this.getOrg(MSPName, nodeType)) {
			logger.info(MSPName, 'exist, createOrUpdateOrg skipped');
			return this;
		}
		const target = this._getTarget(nodeType);
		this.newConfig.channel_group.groups[target].groups[MSPName] = {
			'mod_policy': 'Admins',
			'policies': {
				'Admins': {
					'mod_policy': 'Admins',
					'policy': {
						'type': 1,
						'value': {
							'identities': [
								{
									'principal': {
										'msp_identifier': MSPID,
										role: 'ADMIN'
									},
									principal_classification: 'ROLE'
								}
							],
							'rule': {
								'n_out_of': {
									'n': 1,
									'rules': [
										{
											'signed_by': 0
										}
									]
								}
							},
						}
					}
				},
				'Readers': {
					'mod_policy': 'Admins',
					'policy': {
						'type': 1,
						'value': {
							'identities': [
								{
									'principal': {
										'msp_identifier': MSPID,
										role: 'MEMBER'
									},
									principal_classification: 'ROLE'
								}
							],
							'rule': {
								'n_out_of': {
									'n': 1,
									'rules': [
										{
											'signed_by': 0
										}
									]
								}
							},
						}
					}
				},
				'Writers': {
					'mod_policy': 'Admins',
					'policy': {
						'type': 1,
						'value': {
							'identities': [
								{
									'principal': {
										'msp_identifier': MSPID,
										role: 'MEMBER'
									},
									principal_classification: 'ROLE'
								}
							],
							'rule': {
								'n_out_of': {
									'n': 1,
									'rules': [
										{
											'signed_by': 0
										}
									]
								}
							},
						}
					}
				}
			},
			'values': {
				'MSP': {
					'mod_policy': 'Admins',
					'value': {
						'config': {
							admins: admins.map(admin => {
								return fs.readFileSync(admin).toString('base64');
							}),
							'crypto_config': {
								'identity_identifier_hash_function': 'SHA256',
								'signature_hash_family': 'SHA2'
							},
							name: MSPID,
							'root_certs': root_certs.map(rootCert => {
								return fs.readFileSync(rootCert).toString('base64');
							}),
							'tls_root_certs': tls_root_certs.map(tlsRootCert => {
								return fs.readFileSync(tlsRootCert).toString('base64');
							})
						},
						type: 0
					},
				}
			},

		};
		return this;
	}

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


	build() {
		return JSON.stringify(this.newConfig);
	}
};


/**
 * This requires 'configtxlator' tool be running locally and on port 7059
 * @param channel
 * @param nodeType
 * @param {Peer} peer optional when nodeType is 'peer'
 * @returns {Promise<{original_config_proto: Buffer, original_config: *}>}
 */
exports.getChannelConfigReadable = async (channel, nodeType = 'peer', peer) => {
	let configEnvelope;
	if (nodeType === 'peer') {
		configEnvelope = await channel.getChannelConfig(peer);
	} else {
		configEnvelope = await channel.getChannelConfigFromOrderer();
	}

	//NOTE JSON.stringify(data) :TypeError: Converting circular structure to JSON
	const original_config_proto = configEnvelope.config.toBuffer();

	const body = await agent.decode.config(original_config_proto);

	return {
		original_config_proto,
		original_config: JSON.stringify(JSON.parse(body)),//body is a Buffer,
	};
};
/**
 * @param channel
 * @param {function} mspCB input: {string|json} original_config, output {string|json} update_config
 * @param {function} signatureCollectCB input: {Buffer<binary>} proto, output {{signatures:string[]}} signatures
 * @param {EventHub} eventHub optional when nodeType is 'peer'
 * @param {string} nodeType
 * @param {Peer} peer optional when nodeType is 'peer'
 * @param client
 * @param ordererUrl
 * @returns {Promise<{err: string, original_config: *}>}
 */
exports.channelUpdate = async (
	channel, mspCB, signatureCollectCB, eventHub,
	{nodeType, peer}, client = channel._clientContext, {ordererUrl} = {}) => {
	const orderer = OrdererUtil.find({orderers: channel.getOrderers(), ordererUrl});

	const ERROR_NO_UPDATE = 'No update to original_config';
	const {original_config_proto, original_config} = await exports.getChannelConfigReadable(channel, nodeType, peer);
	const update_configJSONString = await mspCB(original_config);
	if (JSONEqual(update_configJSONString, original_config)) {
		logger.warn(ERROR_NO_UPDATE);
		return {err: ERROR_NO_UPDATE, original_config};
	}
	const body = await agent.encode.config(update_configJSONString);
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
			value: body,
			options: {
				filename: 'updated.proto',
				contentType: 'application/octet-stream'
			}
		}
	};
	const body2 = await agent.compute.updateFromConfigs(formData);
	if(!body2){
		logger.warn(ERROR_NO_UPDATE,'(calculated from configtxlator)');
		return {err: ERROR_NO_UPDATE, original_config};
	}
	const proto = new Buffer(body2, 'binary');
	const {signatures} = await signatureCollectCB(proto);

	const request = {
		config: proto,
		signatures,
		name: channel.getName(),
		orderer,
		txId: client.newTransactionID()
	};

	const updateChannelResp = await client.updateChannel(request);
	if (updateChannelResp.status !== 'SUCCESS') {
		throw JSON.stringify(updateChannelResp);
	}
	logger.info('updateChannel', updateChannelResp);
	if (nodeType === 'orderer') {
		logger.info('orderer update will not trigger block event');
	} else {
		const {block} = await new Promise((resolve, reject) => {
			const onSucc = (_) => resolve(_);
			const onErr = (e) => reject(e);
			EventHubUtil.blockEvent(eventHub, undefined, onSucc, onErr);
		});
		logger.info('new Block', block);
	}
};


