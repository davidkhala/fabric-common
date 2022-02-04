import {consoleLogger} from '@davidkhala/logger/log4.js';

const logger = consoleLogger('test:hsm');
import HSM from '../hsm.js';

describe('HSM', () => {
	it('smoke Test', async () => {

		logger.info('libs', HSM.availablePKCSLibs);
	});
});
