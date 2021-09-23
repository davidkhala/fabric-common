const {connect, Gateway, Identity, Signer, signers} = require('fabric-gateway');
const {promises: fs} = require('fs');
async function newGrpcConnection() {
	const tlsRootCert = await fs.readFile(tlsCertPath);
	const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

	const GrpcClient = grpc.makeGenericClientConstructor({}, '');
	return new GrpcClient(peerEndpoint, tlsCredentials, {
		'grpc.ssl_target_name_override': 'peer0.org1.example.com'
	});
}

async function newIdentity() {
	const credentials = await fs.readFile(certPath);
	return { mspId, credentials };
}

async function newSigner(){
	const privateKeyPem = await fs.readFile(keyPath);
	const privateKey = crypto.createPrivateKey(privateKeyPem);
	return signers.newPrivateKeySigner(privateKey);
}
