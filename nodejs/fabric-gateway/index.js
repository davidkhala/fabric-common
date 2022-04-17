import {connect, signers} from '@hyperledger/fabric-gateway';
import grpc from '@grpc/grpc-js';
import crypto from 'crypto';
import Contract from './contract.js';

export default class FabricGateway {
	/**
	 *
	 * @param {Peer} peer
	 * @param {UserBuilder} user
	 */
	constructor(peer, user) {

		Object.assign(this, {peer, user});

		const {key, mspId, certificate} = user;

		this.identity = {
			mspId,
			credentials: certificate
		};
		this.signer = signers.newPrivateKeySigner(crypto.createPrivateKey(key));

		this.connect();
	}

	get mspId() {
		return this.identity.mspId;
	}

	connect() {
		const {pem, sslTargetNameOverride, endorser: {endpoint: {addr}}} = this.peer;

		const tlsCredentials = grpc.credentials.createSsl(Buffer.from(pem));

		this.client = new grpc.Client(addr, tlsCredentials, {
			'grpc.ssl_target_name_override': sslTargetNameOverride
		});

		this.gateway = connect({
			client: this.client,
			identity: this.identity,
			signer: this.signer
		});
	}

	getContract(channel, chaincode) {
		const network = this.gateway.getNetwork(channel);
		return new Contract(network.getContract(chaincode));
	}

	disconnect() {
		this.gateway.close();
		this.client.close();
		delete this.client;
		delete this.gateway;
	}

}
