const {DiscoveryResultType} = require('./constants');

const resultParser = ({results}) => {
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
				const parsePeer = ({state_info, membership_info, identity}) => {
					// TODO WIP need proto decode
					return {state_info, membership_info, identity};
				};
				for (const [mspid, {peers}] of Object.entries(peers_by_org)) {

					peers_by_org[mspid] = peers.map(parsePeer);

				}
				returned.members = peers_by_org;
			}
				break;
		}
	}
	return returned;
};
module.exports = {
	resultParser
};
