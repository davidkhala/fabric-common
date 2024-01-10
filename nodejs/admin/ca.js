import FabricCAClient from 'fabric-ca-client/lib/FabricCAClient.js';
import Utils from 'fabric-common/lib/Utils.js';
import {emptySuite} from 'khala-fabric-admin/cryptoSuite.js';

export default class FabricCAService {

	constructor({trustedRoots = [], protocol, hostname, port, caname = '', timeout}, cryptoSuite = emptySuite(), logger = console) {
		const tlsOptions = {
			trustedRoots,
			verify: trustedRoots.length > 0
		};
		this._fabricCAClient = new FabricCAClient({
			caname,
			protocol,
			hostname,
			port,
			tlsOptions,
		}, cryptoSuite);
		this.url = `${protocol}://${hostname}:${port}`;
		Object.assign(this, {caname, _cryptoSuite: cryptoSuite, logger});
		if (timeout) {
			Utils.setConfigSetting('connection-timeout', timeout);
		}
	}

	toString() {
		const caClient = this._fabricCAClient;
		const returned = {
			caName: caClient._caName,
			hostname: caClient._hostname,
			port: caClient._port
		};
		const trustedRoots = caClient._tlsOptions.trustedRoots.map(buffer => buffer.toString());
		returned.tlsOptions = {
			trustedRoots,
			verify: caClient._tlsOptions.verify
		};

		return JSON.stringify(returned);
	}


}
