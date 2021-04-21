const helper = require('../builder/helper');
const logger = require('khala-logger/log4js').consoleLogger('test:helper');
const GoUtil = require('../golang');
const assert = require('assert');
describe('misc test', () => {
	it('sha2_256', async () => {
		const hashed = helper.sha2_256('abc');
		assert.strictEqual(hashed, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});
	it('go env GOPATH', async () => {
		const GOPATH = GoUtil.getGOPATH();
		logger.info(GOPATH);
	});
});

