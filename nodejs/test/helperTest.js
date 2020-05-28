const helper = require('../admin/helper');
const logger = require('khala-logger/log4js').consoleLogger('test:helper');
describe('helper', () => {
	it('hash', () => {
		const hashed = helper.sha2_256('abc');
		logger.info(hashed);
	});
});

