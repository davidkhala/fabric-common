const Protobuf = require('./protobuf');

class IdentityProto {
	constructor(node_modules) {
		const protobuf = new Protobuf(node_modules);
		this.identityProto = protobuf.require('msp', 'identities.proto').msp;
	}

	deserialize(serializedIdentity) {
		return this.identityProto.SerializedIdentity.decode(serializedIdentity);
	}

	verifyProposalResponse(proposal_response, cryptoSuite) {
		const endorsement = proposal_response.endorsement;
		const identity = this.deserialize(endorsement.endorser);

		const cert = identity.getIdBytes().toBinary();
		const publicKey = cryptoSuite.importKey(cert, {algorithm: 'X509Certificate', ephemeral: true});
		const digest = Buffer.concat([proposal_response.payload, endorsement.endorser]);

		const verifyResult = cryptoSuite.verify(publicKey, endorsement.signature, digest);
		return verifyResult;
	}
}

module.exports = IdentityProto;


