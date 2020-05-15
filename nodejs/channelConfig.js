const logger = require('khala-logger/log4js').consoleLogger('channel-config');

const ConfigtxlatorServer = require('./configtxlator');
const configtxlatorServer = new ConfigtxlatorServer();
const {getChannelConfigFromOrderer} = require('./channel');
const BinManager = require('./binManager');
const {DecodeType} = require('khala-fabric-formatter/configtxlator');
const ConfigFactory = require('khala-fabric-formatter/configFactory');
/**
 * TODO migration
 * Note that it could be used to extract application channel from orderer
 * @param {string} channelName
 * @param user
 * @param {Orderer} orderer targeted orderer from which we fetch block
 * @param {boolean} [viaServer]
 *  true: This requires 'configtxlator' RESTful server running locally on port 7059
 *  false: use 'configtxlator' as command line tool
 * @returns {Promise<{proto: Buffer, json: string|json}>}
 */
const getChannelConfigReadable = async (channelName, user, orderer, viaServer) => {

	const configEnvelope = await getChannelConfigFromOrderer(channelName, user, orderer);
	const proto = configEnvelope.config.toBuffer();

	let json;
	if (viaServer) {
		const body = await configtxlatorServer.decode(proto, DecodeType.Config);
		json = JSON.stringify(body);
	} else {

		const binManager = new BinManager();
		json = await binManager.configtxlatorCMD.decode(DecodeType.Config, proto);
	}

	return {
		proto,
		json
	};
};


// TODO migration

const setAnchorPeers = async (channel, orderer, OrgName, anchorPeers,
                              signers = [channel._clientContext], {peer, client = channel._clientContext, viaServer} = {}) => {

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


module.exports = {
	getChannelConfigReadable,
};