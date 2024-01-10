import {DiscoveryResultType} from './constants.js';
import fabprotos from 'fabric-protos';
import assert from 'assert';
import {calculatePKI_ID} from './helper.js';

export const ParsePeerResult = ({identity, membership_info, state_info}) => {
	const peer = {};
	// IDENTITY
	const {mspid, id_bytes} = fabprotos.msp.SerializedIdentity.decode(identity);
	peer.identity = {
		mspid,
		id_bytes: id_bytes.toString()
	};

	// MEMBERSHIP - Peer.membership_info
	// gossip.Envelope.payload
	const {payload, signature, secret_envelope} = membership_info;
	assert.strictEqual(secret_envelope, null);
	const {tag, alive_msg} = fabprotos.gossip.GossipMessage.decode(payload);
	assert.strictEqual(tag, 1);
	const {membership: {endpoint, pki_id}, timestamp: {inc_num, seq_num}} = alive_msg;
	const pki_id_hex = pki_id.toString('hex');
	assert.strictEqual(pki_id_hex, calculatePKI_ID({mspid, id_bytes}));
	peer.membership_info = {
		endpoint,
		// pki_id is a digest(sha256) of [mspID, IdBytes] from a peer.
		// See in Fabric core code `GetPKIidOfCert(peerIdentity api.PeerIdentityType) common.PKIidType`
		pki_id: pki_id_hex
	};
	peer.timestamp = {
		// Date.now() in nano second. 19 digits length. UnixSecond is 13 digits length
		unix_nano: inc_num.toString(),
		// auto-increment as long as gossip alive in the blockchain network. (starting from 0)
		logical_time: seq_num.toInt()
	};

	// STATE
	if (state_info) {
		const {payload, signature, secret_envelope} = state_info;
		assert.strictEqual(secret_envelope, null);
		const {tag, state_info: {timestamp, pki_id, channel_MAC, properties}} = fabprotos.gossip.GossipMessage.decode(payload);

		// channel_MAC is an authentication code that proves that the peer that sent this message knows the name of the channel.
		channel_MAC;
		assert.strictEqual(tag, 5);
		const {chaincodes, ledger_height} = properties;
		peer.ledger_height = ledger_height.toInt();
		peer.chaincodes = chaincodes.map(({name, version}) => ({name, version}));
	}
	return peer;
};
export const ParseResult = ({results}) => {
	const returned = {};

	for (const {result, error, config_result, cc_query_res, members} of results) {
		switch (result) {
			case DiscoveryResultType.error:
				returned.error = error;
				break;
			case DiscoveryResultType.cc_query_res:
				returned.cc_query_res = cc_query_res.content;
				break;
			case DiscoveryResultType.config_result: {

				const {msps, orderers} = config_result;

				for (const [mspid, q_msp] of Object.entries(msps)) {
					msps[mspid] = {
						organizational_unit_identifiers: q_msp.organizational_unit_identifiers,
						root_certs: q_msp.root_certs.toString().trim(),
						intermediate_certs: q_msp.intermediate_certs.toString().trim(),
						admins: q_msp.admins.toString().trim(),
						tls_root_certs: q_msp.tls_root_certs.toString().trim(),
						tls_intermediate_certs: q_msp.tls_intermediate_certs.toString().trim()
					};
				}

				for (const [mspid, {endpoint}] of Object.entries(orderers)) {
					orderers[mspid] = endpoint;
				}
				returned.config_result = config_result;
			}
				break;
			case DiscoveryResultType.members: {
				const {peers_by_org} = members;


				for (const [mspid, {peers}] of Object.entries(peers_by_org)) {

					peers_by_org[mspid] = peers;

				}
				returned.members = peers_by_org;
			}
				break;
		}
	}
	return returned;
};
