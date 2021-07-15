const Utils = require('fabric-common/lib/Utils');
const fabprotos = require('fabric-protos');
const commonProto = fabprotos.common;
const {buildSignatureHeader, buildChannelHeader, buildHeader, buildPayload, buildSeekPayload} = require('khala-fabric-formatter/protoTranslator');
const {DeliverResponseStatus: {SERVICE_UNAVAILABLE}, DeliverResponseType: {STATUS}} = require('khala-fabric-formatter/eventHub');
const {BufferFrom, ProtoFrom} = require('khala-fabric-formatter/protobuf');
const sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

class SigningIdentityUtil {
	/**
	 *
	 * @param {SigningIdentity} signingIdentity
	 */
	constructor(signingIdentity) {
		this.signingIdentity = signingIdentity;
	}

	signChannelConfig(config, nonce, asBuffer) {

		if (!nonce) {
			nonce = Utils.getNonce();
		}
		const {signingIdentity} = this;

		const signature_header = buildSignatureHeader({Creator: signingIdentity.serialize(), Nonce: nonce}, true);

		// get all the bytes to be signed together, then sign
		const signing_bytes = Buffer.concat([signature_header, config]);
		const signature = Buffer.from(signingIdentity.sign(signing_bytes));

		// build the return object
		const proto_config_signature = ProtoFrom({signature_header, signature}, commonProto.ConfigSignature);

		if (asBuffer) {
			return BufferFrom(proto_config_signature);
		}
		return proto_config_signature;
	}


	/**
	 *
	 * Channel configuration updates can be sent to the orderers to be processed.
	 * The orderer ensures channel updates will be made only when enough signatures are discovered in the request.
	 * Channel creation policy can be customized when the consortium is defined.
	 * @param {IdentityContext|{transactionId, nonce}} identityContext
	 * @param [config]
	 * @param {Buffer[]} [signatures]
	 * @param [envelope]
	 * @param name
	 * @param {Committer} committer
	 * @param [commitTimeout]
	 */
	async updateChannel(identityContext, {config, signatures, envelope, name, committer}, commitTimeout) {
		const {signingIdentity} = this;
		const {transactionId, nonce} = identityContext;
		let signature, payload;
		if (envelope) {
			const envelopeDecoded = commonProto.Envelope.decode(envelope);
			signature = envelopeDecoded.signature;
			payload = envelopeDecoded.payload;
		} else {
			const signaturesDecoded = signatures.map(commonProto.ConfigSignature.decode);

			const configUpdateEnvelope = ProtoFrom({config_update: config, signatures: signaturesDecoded}, commonProto.ConfigUpdateEnvelope);
			const channelHeader = buildChannelHeader({
				Type: commonProto.HeaderType.CONFIG_UPDATE,
				ChannelId: name,
				TxId: transactionId
			});

			const header = buildHeader({
				Creator: signingIdentity.serialize(),
				Nonce: nonce,
				ChannelHeader: channelHeader
			});
			payload = buildPayload({
				Header: header,
				Data: BufferFrom(configUpdateEnvelope),
			}, true);
			signature = Buffer.from(signingIdentity.sign(payload));
		}

		const result = await committer.sendBroadcast({
			signature,
			payload
		}, commitTimeout);
		return result;

	}

	async getSpecificBlock(identityContext, ChannelId, orderer, blockHeight, opts = {}) {
		const {signingIdentity} = this;
		const {transactionId, nonce} = identityContext;
		const payload = buildSeekPayload({
			Creator: signingIdentity.serialize(),
			Nonce: nonce,
			ChannelId,
			TxId: transactionId,
		}, blockHeight, blockHeight, undefined, true);
		const signature = Buffer.from(signingIdentity.sign(payload));

		const {waitIfUNAVAILABLE, requestTimeout} = opts;

		const sendTry = async () => {
			try {
				const result = await orderer.sendDeliver({signature, payload}, requestTimeout);
				return result[0];
			} catch (e) {
				if (waitIfUNAVAILABLE) {
					const {status, Type, block} = e;
					if (status === SERVICE_UNAVAILABLE && Type === STATUS && block === null) {
						await sleep(waitIfUNAVAILABLE);
						return sendTry();
					}
				}
				throw e;
			}
		};
		return await sendTry();

	}
}

module.exports = SigningIdentityUtil;
