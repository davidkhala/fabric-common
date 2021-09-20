const {connect, Gateway, Identity, Signer, signers} = require('fabric-gateway');
const {promises: fs} = require('fs');
async function newGrpcConnection(): Promise<ServiceClient> {
	const tlsRootCert = await fs.readFile(tlsCertPath);
	const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

	const GrpcClient = grpc.makeGenericClientConstructor({}, '');
	return new GrpcClient(peerEndpoint, tlsCredentials, {
		'grpc.ssl_target_name_override': 'peer0.org1.example.com'
	});
}
const gateway = connect({
	client,
	identity: await newIdentity(),
	signer: await newSigner(),
});