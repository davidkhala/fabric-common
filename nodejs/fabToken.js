const _TokenClient = require('fabric-client/lib/TokenClient');
const User = require('fabric-common/lib/User');
const ClientUtil = require('./client');

/**
 * This object contains properties that specify the owner, type, and quantity of a token kind.
 * @typedef TokenParam
 * @property {byte[]|User} user - Required for issue and transfer. The serialized bytes or User object for the recipient.
 * @property {string} [type] - Required for issue. The type of the token.
 * @property {number|string} quantity - Required. The quantity of the token
 */


const paramConvertor = ({user, type, quantity}) => ({
	owner: user instanceof User ? user.getIdentity().serialize() : user,
	type,
	quantity: `${quantity}`
});

/**
 * @typedef UnspentToken
 * @property {TokenId} id
 * @property {string} type
 * @property {string} quantity
 */

/**
 *
 * @typedef TokenId
 * @property {string} tx_id
 * @property {number} index
 */
class TokenClient {

	/**
	 * @param {Channel} channel - The channel object.
	 * @param {Peer[]} peers - The prover peer(s) that are trusted by the token client
	 */
	constructor(channel, peers) {
		this.tokenClient = new _TokenClient(channel._clientContext, channel, peers);
	};

	getUser() {
		return ClientUtil.getUser(this.tokenClient._client);
	}

	/**
	 * @param {TokenParam[]} params
	 * @returns {Promise<BroadcastResponse>}
	 */
	async issue(params) {
		const txId = this.tokenClient._client.newTransactionID();
		const request = {
			params: params.map(paramConvertor),
			txId
		};

		return await this.tokenClient.issue(request);
	}

	async list() {
		const result = await this.tokenClient.list();
		result.balance = result.reduce((balance, {quantity}) => balance + Number(quantity), 0);
		return result;
	}

	/**
	 *
	 * @param {TokenParam[]} params each param for each transfer target
	 * @param {UnspentToken[]} unspentTokens
	 * @returns {Promise<BroadcastResponse>}
	 */
	async transfer(params, unspentTokens) {
		const txId = this.tokenClient._client.newTransactionID();
		const request = {
			params: params.map(paramConvertor),
			tokenIds: unspentTokens.map(({id}) => id),
			txId
		};
		return await this.tokenClient.transfer(request);

	}

	/**
	 *
	 * @param {string|number} quantity quantity array is not supported for redeem
	 * @param {UnspentToken[]} unspentTokens unspent balance to use
	 * @returns {Promise<BroadcastResponse>}
	 */
	async redeem(quantity, unspentTokens) {

		const txId = this.tokenClient._client.newTransactionID();
		const request = {
			tokenIds: unspentTokens.map(({id}) => id),
			params: [{quantity: `${quantity}`}],
			txId
		};

		return await this.tokenClient.redeem(request);
	}

}

exports.TokenClient = TokenClient;

