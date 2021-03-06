const {BroadcastResponseStatus} = require('khala-fabric-formatter/constants');
const SigningIdentityUtil = require('./signingIdentity');
const IdentityContext = require('fabric-common/lib/IdentityContext');

class ChannelUpdate {

	/**
	 *
	 * @param {string} channelName
	 * @param {Client.User} user
	 * @param {Committer} committer
	 * @param [logger]
	 */
	constructor(channelName, user, committer, logger = console) {
		this.name = channelName;
		this.signingIdentityUtil = new SigningIdentityUtil(user.getSigningIdentity());
		this.identityContext = new IdentityContext(user, null);
		this.logger = logger;
		this.committer = committer;
		this.content = {name: channelName, config: undefined, signatures: undefined, envelope: undefined};
	}

	/**
	 *
	 * @param {Buffer} envelope
	 */
	useEnvelope(envelope) {
		this.content.envelope = envelope;
		delete this.content.config;
		delete this.content.signatures;
	}

	/**
	 * @param {Buffer} config
	 * @param {Buffer[]} signatures
	 */
	useSignatures(config, signatures) {
		this.content.config = config;
		this.content.signatures = signatures;
		delete this.content.envelope;
	}

	async submit({transactionId, nonce} = {}) {
		const {identityContext, signingIdentityUtil, content, committer} = this;
		if (!nonce) {
			identityContext.calculateTransactionId();
			transactionId = identityContext.transactionId;
			nonce = identityContext.nonce;
		}
		const {status, info} = await signingIdentityUtil.updateChannel({transactionId, nonce}, content, committer);
		if (status !== BroadcastResponseStatus.SUCCESS) {
			this.logger.error(`[${this.name}] channel update: status=[${status}], info=[${info}]`);
		}
		return {status, info};
	}

}

module.exports = ChannelUpdate;
