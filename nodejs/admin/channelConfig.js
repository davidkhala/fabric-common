const fabricProtos = require('fabric-protos');
const commonProto = fabricProtos.common;
/**
 * Extracts the protobuf 'ConfigUpdate' object out of the 'ConfigEnvelope' object
 * that is produced by the [configtxgen tool]{@link http://hyperledger-fabric.readthedocs.io/en/latest/configtxgen.html}.
 * The returned object may then be signed using the signChannelConfig() method of this class.
 *
 * @param {string|Buffer} config_envelope - channel config file content
 * @returns {Buffer} The encoded bytes of the ConfigUpdate protobuf
 */
exports.extractChannelConfig = (config_envelope) => {
	const envelope = commonProto.Envelope.decode(config_envelope);
	const payload = commonProto.Payload.decode(envelope.getPayload().toBuffer());
	const configtx = commonProto.ConfigUpdateEnvelope.decode(payload.getData().toBuffer());
	return configtx.getConfigUpdate().toBuffer();
};




//TODO channel.getChannelConfigFromOrderer();
//TODO channel.getChannelConfig(peer);