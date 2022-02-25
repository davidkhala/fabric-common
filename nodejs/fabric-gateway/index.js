import {signers, connect} from 'fabric-gateway';
import grpc from '@grpc/grpc-js';
import crypto from 'crypto';

export default class FabricGateway {
	/**
	 *
	 * @param {Peer} peer
	 * @param {UserBuilder} user
	 */
	constructor(peer, user) {


		const {pem, sslTargetNameOverride, endorser: {endpoint: {url}}} = peer;
		// TODO should url be format like 'localhost:7051'

		const {key, mspId, certificate} = user;

		const tlsCredentials = grpc.credentials.createSsl(Buffer.from(pem));

		const GrpcClient = grpc.makeGenericClientConstructor({}, '');
		const client = new GrpcClient(url, tlsCredentials, {
			'grpc.ssl_target_name_override': sslTargetNameOverride
		});

		this.gateway = connect({
			client,
			identity: {
				mspId,
				credentials: certificate
			},
			signer: signers.newPrivateKeySigner(crypto.createPrivateKey(key))
		});
	}

	getContract(channel, chaincode) {
		const network = this.gateway.getNetwork(channel);
		return network.getContract(chaincode);
	}

}
