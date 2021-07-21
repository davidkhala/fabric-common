const User = require('fabric-common/lib/User');
const SigningIdentity = require('fabric-common/lib/SigningIdentity');
const Signer = require('fabric-common/lib/Signer');
const path = require('path');
const fs = require('fs');
const Utils = require('fabric-common/lib/Utils');
exports.getSampleUser = () => {
	const user = new User('Admin@icdd');
	const certificatePath = path.resolve(__dirname, 'artifacts/msp/signcerts/Admin@icdd-cert.pem');
	const certificate = fs.readFileSync(certificatePath).toString();
	const privateKeyPath = path.resolve(__dirname, 'artifacts/msp/keystore/c0279b7aa51808dff94c6ea7d00204732e6570dd711bb110317eecbaa695c6be_sk');
	const key = fs.readFileSync(privateKeyPath).toString();
	const mspid = 'icddMSP';
	user._cryptoSuite = Utils.newCryptoSuite();
	const privateKey = user._cryptoSuite.createKeyFromRaw(key);
	////
	const {_cryptoSuite} = user;


	const pubKey = _cryptoSuite.createKeyFromRaw(certificate);
	user._signingIdentity = new SigningIdentity(certificate, pubKey, mspid, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
	user.getIdentity = () => {
		return user._signingIdentity;
	};
	return user;
};
