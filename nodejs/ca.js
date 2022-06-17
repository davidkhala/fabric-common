import path from 'path';
import IdentityService from './identityService.js';
import {consoleLogger} from '@davidkhala/logger/log4.js';

const logger = consoleLogger('CA core');
const FABRIC_CA_HOME = '/etc/hyperledger/fabric-ca-server';
export const container = {
	FABRIC_CA_HOME,
	CONFIG: path.resolve(FABRIC_CA_HOME, 'fabric-ca-server-config.yaml'),
	tlsCert: path.resolve(FABRIC_CA_HOME, 'tls-cert.pem')
};

const registerIfNotExist = async (caService, admin, {enrollmentID, enrollmentSecret, affiliation, role, attrs}) => {
	try {
		const identityService = new IdentityService(caService, admin);

		const secret = await identityService.create({
			enrollmentID, enrollmentSecret, affiliation, role, attrs
		});
		if (!enrollmentSecret) {
			logger.info({affiliation}, 'new enrollmentSecret generated by ca service');
			return {enrollmentID, enrollmentSecret: secret, status: 'generated'};
		} else {
			return {enrollmentID, enrollmentSecret, status: 'assigned'};
		}
	} catch (err) {
		logger.warn(err.toString());
		if (err.toString().includes('is already registered')) {
			return {enrollmentID, enrollmentSecret, status: 'existed'};
		} else {
			throw err;
		}
	}
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
export {registerIfNotExist as register};

