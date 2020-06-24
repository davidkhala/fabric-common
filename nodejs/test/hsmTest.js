const logger = require('khala-logger/log4js').consoleLogger('test:hsm');

describe('HSM', () => {
	it('smoke Test', async () => {
		const HSM = require('../hsm');
		logger.info('libs', HSM.availablePKCSLibs);
	});
});
