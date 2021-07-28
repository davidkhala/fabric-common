const User = require('fabric-common/lib/User');
const SigningIdentity = require('fabric-common/lib/SigningIdentity');
const Signer = require('fabric-common/lib/Signer');
const path = require('path');
const fs = require('fs');
const Utils = require('fabric-common/lib/Utils');
const {getOneKeystore} = require('khala-fabric-formatter/path')
exports.getSampleUser = () => {
	const user = new User('Admin@icdd');
	const certificatePath = path.resolve(__dirname, 'artifacts/msp/signcerts/Admin@icdd-cert.pem');
	const certificate = fs.readFileSync(certificatePath).toString();
	const privateKeyPath = path.resolve(__dirname, 'artifacts/msp/keystore');
	const key = getOneKeystore(privateKeyPath);
	const mspid = 'icddMSP';
	user._cryptoSuite = Utils.newCryptoSuite();
	const privateKey = user._cryptoSuite.createKeyFromRaw(key);
	//
	const {_cryptoSuite} = user;


	const pubKey = _cryptoSuite.createKeyFromRaw(certificate);
	user._signingIdentity = new SigningIdentity(certificate, pubKey, mspid, _cryptoSuite, new Signer(_cryptoSuite, privateKey));
	user.getIdentity = () => {
		return user._signingIdentity;
	};
	return user;
};
