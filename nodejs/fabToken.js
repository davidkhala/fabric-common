const _TokenClient = require('fabric-client/lib/TokenClient');

/**
 * @typedef tokenParam
 * @property {User} user
 * @property {} type
 * @property {} quantity
 */
class TokenClient {

	/**
	 * @param {Channel} channel - The channel object.
	 * @param {Peer[]} peers - The prover peer(s) that are trusted by the token client
	 */
	constructor(channel, peers) {
		this.tokenClient = new _TokenClient(channel._clientContext, channel, peers);
	};

	/**
	 * @param {tokenParam[]} params
	 * @returns {Promise<*>}
	 */
	async issue(params) {
		const txId = this.tokenClient._client.newTransactionID();
		const request = {
			params: params.map(({user, type, quantity}) => ({owner: user.getIdentity().serialize(), type, quantity})),
			txId
		};

		return await this.tokenClient.issue(request);
	}

}

exports.TokenClient = TokenClient;

