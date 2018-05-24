const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const os = require('os');
exports.home = () => {
	return os.homedir();
};
exports.findKeyfiles = (dir) => {
	const files = fs.readdirSync(dir);
	return files.filter((fileName) => fileName.endsWith('_sk')).map((fileName) => path.resolve(dir, fileName));
};
/**
 * @type {CryptoPath}
 */
exports.CryptoPath = class {
	constructor(rootPath, {orderer, peer, user, react} = {}) {
		if (orderer) {
			this.ordererOrgName = orderer.org;
			this.ordererName = orderer.name;
			if (orderer.name && orderer.org) {
				this.ordererHostName = `${orderer.name}.${orderer.org}`;
			}
		}
		if (peer) {
			this.peerOrgName = peer.org;
			this.peerName = peer.name;
			if (peer.name && peer.org) {
				this.peerHostName = `${peer.name}.${peer.org}`;
			}
		}
		if (user) {
			this.userName = user.name;
			if (this.ordererOrgName) {
				this.ordererUserHostName = `${this.userName}@${this.ordererOrgName}`;
			}
			if (this.peerOrgName) {
				this.peerUserHostName = `${this.userName}@${this.peerOrgName}`;
			}
		}

		this.root = rootPath;
		this.react = react;
	}

	setReact(react) {
		this.react = react;
	}

	resolve(...tokens) {
		const result = path.resolve(...tokens);
		const dir = path.dirname(result);
		switch (this.react) {
			case 'throw':
				if (!fs.existsSync(dir)) {
					throw new Error(`${dir} not exist`);
				}
				break;
			case 'mkdir':
				fsExtra.ensureDirSync(result);
				break;
			default:
		}
		return result;
	}

	ordererOrg() {
		return this.resolve(this.root, 'ordererOrganizations', this.ordererOrgName);
	}
	ordererOrgMSP() {
		return this.resolve(this.ordererOrg(),'msp');
	}

	peerOrg() {
		return this.resolve(this.root, 'peerOrganizations', this.peerOrgName);
	}
	peerOrgMSP() {
		return this.resolve(this.peerOrg(),'msp');
	}

	orderers() {
		return this.resolve(this.ordererOrg(), 'orderers');
	}

	ordererUsers() {
		return this.resolve(this.ordererOrg(), 'users');
	}

	peers() {
		return this.resolve(this.peerOrg(), 'peers');
	}

	peerUsers() {
		return this.resolve(this.peerOrg(), 'users');
	}


	peerTLS() {
		return this.resolve(this.peers(), this.peerHostName, 'tls');
	}

	ordererTLS() {
		return this.resolve(this.orderers(), this.ordererHostName, 'tls');
	}

	peerTLSFile() {
		const tlsDIR = this.peerTLS();
		return {
			caCert: this.resolve(tlsDIR, 'ca.crt'),
			cert: this.resolve(tlsDIR, 'server.crt'),
			key: this.resolve(tlsDIR, 'server.key')
		};
	}
	ordererTLSFile() {
		const tlsDIR = this.ordererTLS();
		return {
			caCert: this.resolve(tlsDIR, 'ca.crt'),
			cert: this.resolve(tlsDIR, 'server.crt'),
			key: this.resolve(tlsDIR, 'server.key')
		};
	}

	peerCacerts() {
		return this.resolve(this.peerOrgMSP(), 'cacerts', `ca.${this.peerOrgName}-cert.pem`);
	}

	ordererCacerts() {
		return this.resolve(this.ordererOrgMSP(), 'cacerts', `ca.${this.ordererOrgName}-cert.pem`);
	}


	MSPKeystore(type) {
		const dir = this.resolve(this.MSP(type), 'keystore');
		return {dir, file: exports.findKeyfiles(dir)[0]};
	}

	MSP(type) {
		return this.resolve(this[`${type}s`](), this[`${type}HostName`], 'msp');
	}

	MSPSigncert(type) {
		return this.resolve(this.MSP(type), 'signcerts', `${this[`${type}HostName`]}-cert.pem`);
	}

	cryptoExistLocal(type) {
		const signcertFile = this.MSPSigncert(type);
		if (!fs.existsSync(signcertFile)) return;
		const keyFile = this.MSPKeystore(type).file;
		if (!fs.existsSync(keyFile)) return;
		return signcertFile;
	}
};