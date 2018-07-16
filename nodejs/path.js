const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const os = require('os');
exports.homeResolve = (relativePath, ...tokens) => {
	return path.resolve(os.homedir(), relativePath, ...tokens);
};
exports.findKeyfiles = (dir) => {
	const files = fs.readdirSync(dir);
	return files.filter((fileName) => fileName.endsWith('_sk')).map((fileName) => path.resolve(dir, fileName));
};
exports.CryptoPath = class {
	constructor(rootPath, {orderer, peer, user, password} = {}) {
		this.password = password;
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
	}

	setReact(react) {
		this.react = react;
		return this;
	}

	resolve(...tokens) {
		const result = path.resolve(...tokens);
		const dir = path.dirname(result);
		switch (this.react) {
			case 'throw':
				if (!fsExtra.pathExistsSync(dir)) {
					throw new Error(`${dir} not exist`);
				}
				break;
			case 'mkdir':
				fsExtra.ensureDirSync(dir);
				break;
			default:
		}
		return result;
	}

	ordererOrg() {
		return this.resolve(this.root, 'ordererOrganizations', this.ordererOrgName);
	}

	ordererOrgMSP() {
		return this.resolve(this.ordererOrg(), 'msp');
	}

	peerOrg() {
		return this.resolve(this.root, 'peerOrganizations', this.peerOrgName);
	}

	OrgFile(nodeType) {
		const dir = this[`${nodeType}Org`]();
		const mspDir = this.resolve(dir, 'msp');
		const caCertBaseName = `ca.${this[`${nodeType}OrgName`]}-cert.pem`;
		const tlscaCertBaseName = `tls${caCertBaseName}`;
		return {
			ca: this.resolve(dir, 'ca', caCertBaseName),
			msp: {
				admincerts: this.resolve(mspDir, 'admincerts', `${this[`${nodeType}UserHostName`]}-cert.pem`),
				cacerts: this.resolve(mspDir, 'cacerts', caCertBaseName),
				tlscacerts: this.resolve(mspDir, 'tlscacerts', tlscaCertBaseName)
			},
			peers: this.resolve(dir, 'peers'),
			tlsca: this.resolve(dir, 'tlsca', tlscaCertBaseName),
			users: this.resolve(dir, 'users')
		};
	}

	static getNodeType(type) {
		return type.includes('orderer') ? 'orderer' : 'peer';
	}

	MSPFile(type) {
		const nodeType = this.constructor.getNodeType(type);
		const mspDir = this.MSP(type);
		const caCertBaseName = `ca.${this[`${nodeType}OrgName`]}-cert.pem`;
		const tlscaCertBaseName = `tls${caCertBaseName}`;

		return {
			admincerts: this.resolve(mspDir, 'admincerts', `${this[`${nodeType}UserHostName`]}-cert.pem`),
			cacerts: this.resolve(mspDir, 'cacerts', caCertBaseName),
			tlscacerts: this.resolve(mspDir, 'tlscacerts', tlscaCertBaseName),
			keystore: this.resolve(mspDir, 'keystore'),
			signcerts: this.resolve(mspDir, 'signcerts', `${this[`${type}HostName`]}-cert.pem`),
		};
	}

	peerOrgMSP() {
		return this.resolve(this.peerOrg(), 'msp');
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

	tlsDir(type) {
		return this.resolve(this[`${type}s`](), this[`${type}HostName`], 'tls');
	}

	TLSFile(type) {
		const tlsDIR = this.tlsDir(type);
		return {
			caCert: this.resolve(tlsDIR, 'ca.crt'),
			cert: this.resolve(tlsDIR, 'server.crt'),
			key: this.resolve(tlsDIR, 'server.key')
		};
	}


	MSPKeystore(type) {
		const dir = this.MSPFile(type).keystore;
		const files = exports.findKeyfiles(dir);
		if (files.length > 0) return files[0];
	}

	MSP(type) {
		return this.resolve(this[`${type}s`](), this[`${type}HostName`], 'msp');
	}

	cryptoExistLocal(type) {
		const signcerts = this.MSPFile(type).signcerts;
		if (!fsExtra.pathExistsSync(signcerts)) return;
		const keystore = this.MSPKeystore(type);
		if (!fsExtra.pathExistsSync(keystore)) return;
		return {keystore, signcerts};
	}
};
exports.fsExtra = fsExtra;