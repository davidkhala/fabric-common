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

	/**
	 * because we will not change the 'version' property, so it will never be totally identical
	 * @param MSPName
	 * @param MSPID
	 * @param nodeType
	 * @param {string[]} admins pem file path array
	 * @param {string[]} root_certs pem file path array
	 * @param {string[]} tls_root_certs pem file path array
	 */
	newOrg(MSPName, MSPID, nodeType, {admins = [], root_certs = [], tls_root_certs = []} = {}) {
		const target = this._getTarget(nodeType);
		if (this.newConfig.channel_group.groups[target].groups[MSPName]) {
			logger.info(MSPName, 'exist, adding skipped');
			return this;
		}
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
							'admins': admins.map(admin => {
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
		}
		return this;
	}

	getOrdererAddresses() {
		return this.newConfig.channel_group.values.OrdererAddresses.value.addresses;
	}

	setOrdererAddresses(addresses) {
		this.newConfig.channel_group.values.OrdererAddresses.value.addresses = addresses;
		return this;
	}

	getKafkaBrokers() {
		return this.newConfig.channel_group.groups.Orderer.values.KafkaBrokers.value.brokers;
	}

	setKafkaBrokers(brokers) {
		this.newConfig.channel_group.groups.Orderer.values.KafkaBrokers.value.brokers = brokers;
		return this;
	}


	build() {
		return JSON.stringify(this.newConfig);
	}
};


/**
 * This requires 'configtxlator' tool be running locally and on port 7059
 * fixme :run configtxlator.server with nodejs child_process, program will hang and no callback or stdout
 * @param channel
 * @param nodeType
 * @returns {Promise<{original_config_proto: Buffer, original_config: *}>}
 */
exports.getChannelConfigReadable = async (channel, nodeType = 'peer') => {
	let configEnvelope;
	if (nodeType === 'peer') {
		configEnvelope = await channel.getChannelConfig();
	} else {
		configEnvelope = await channel.getChannelConfigFromOrderer();
	}

	//NOTE JSON.stringify(data ) :TypeError: Converting circular structure to JSON
	const original_config_proto = configEnvelope.config.toBuffer();
	channel.loadConfigEnvelope(configEnvelope);//TODO redundant?

	const {body} = await agent.decode.config(original_config_proto);
	return {
		original_config_proto,
		original_config: body,
	};
};
/**
 * @param channel
 * @param {function} mspCB input: {string|json} original_config, output {string|json} update_config
 * @param {function} signatureCollectCB input: {Buffer<binary>} proto, output {{signatures:string[]}} signatures
 * @param eventHub
 * @param client
 * @param ordererUrl
 * @returns {Promise<{err: string, original_config: *}>}
 */
exports.channelUpdate = async (channel, mspCB, signatureCollectCB, eventHub, client = channel._clientContext, {ordererUrl} = {}) => {
	const orderer = OrdererUtil.find({orderers: channel.getOrderers(), ordererUrl});

	eventHub._clientContext = client;

	const ERROR_NO_UPDATE = 'No update to original_config';
	const {original_config_proto, original_config} = await exports.getChannelConfigReadable(channel);
	const update_configJSONString = await mspCB(original_config);
	if (JSONEqual(update_configJSONString, original_config)) {
		logger.warn(ERROR_NO_UPDATE);
		return {err: ERROR_NO_UPDATE, original_config};
	}
	const {body} = await agent.encode.config(update_configJSONString);
	//NOTE: after delete MSP, deleted peer retry to connect to previous channel
	// PMContainerName.delphi.com       | 2017-08-24 03:02:55.815 UTC [blocksProvider] DeliverBlocks -> ERRO 2ea [delphichannel] Got error &{FORBIDDEN}
	// orderContainerName.delphi.com    | 2017-08-24 03:02:55.814 UTC [cauthdsl] func1 -> DEBU ea5 0xc420028c50 gate 1503543775814648321 evaluation fails
	// orderContainerName.delphi.com    | 2017-08-24 03:02:55.814 UTC [orderer/common/deliver] Handle -> WARN ea6 [channel: delphichannel] Received unauthorized deliver request
	// orderContainerName.delphi.com    | 2017-08-24 03:02:55.814 UTC [cauthdsl] func2 -> ERRO e9d Principal deserialization failure (MSP PMMSP is unknown)

	// PMContainerName.delphi.com       | 2017-08-24 03:03:15.823 UTC [deliveryClient] RequestBlocks -> DEBU 2ed Starting deliver with block [1] for channel delphichannel
	// PMContainerName.delphi.com       | 2017-08-24 03:03:15.824 UTC [blocksProvider] DeliverBlocks -> ERRO 2ee [delphichannel] Got error &{FORBIDDEN}
	// PMContainerName.delphi.com       | 2017-08-24 03:03:15.824 UTC [blocksProvider] DeliverBlocks -> CRIT 2ef [delphichannel] Wrong statuses threshold passed, stopping block provider
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
	const {body: body2} = await agent.compute.updateFromConfigs(formData);
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
	const {block} = await new Promise((resolve, reject) => {
		const onSucc = (_) => resolve(_);
		const onErr = (e) => reject(e);
		EventHubUtil.blockEvent(eventHub, undefined, onSucc, onErr);
	});
	logger.info('new Block', block);
	return block;
};


