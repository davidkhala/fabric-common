import Path from 'path';
import IdentityService from './identityService.js';
import {axiosPromise} from '@davidkhala/axios/index.js';
import {consoleLogger} from '@davidkhala/logger/log4.js';

const logger = consoleLogger('CA core');
const FABRIC_CA_HOME = '/etc/hyperledger/fabric-ca-server';
export const container = {
	FABRIC_CA_HOME,
	CONFIG: Path.resolve(FABRIC_CA_HOME, 'fabric-ca-server-config.yaml'),
	tlsCert: Path.resolve(FABRIC_CA_HOME, 'tls-cert.pem')
};

// TODO e2e test
export const intermediateCA = {
	register: async (caService, admin, {enrollmentID, enrollmentSecret, affiliation}) => {
		return await registerIfNotExist(caService, admin, {
			enrollmentID, enrollmentSecret,
			affiliation, role: 'user',
			attrs: [{name: 'hf.IntermediateCA', value: 'true'}]
		});
	}
};

/**
 *
 * @param {string} caUrl
 * @param [options]
 */
export async function ping(caUrl, options = {rejectUnauthorized: false}) {
	const {result} = await axiosPromise({url: `${caUrl}/cainfo`, method: 'GET'}, options);

	return {
		caName: result.CAName,
		caChain: Buffer.from(result.CAChain, 'base64').toString(),
		issuerPublicKey: Buffer.from(result.IssuerPublicKey, 'base64').toString(),
		issuerRevocationPublicKey: Buffer.from(result.IssuerRevocationPublicKey, 'base64').toString(),
		version: result.Version,
	};
}

