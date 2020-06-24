const Package = require('../chaincodePackage');
const fs = require('fs');
const path = require('path');
const logger = require('khala-logger/log4js').consoleLogger('test:package');
describe('package', () => {
	it('pack', async () => {
		const srcRoot = path.resolve(__dirname, 'artifacts');
		logger.info({srcRoot});
		const Label = 'ccID';
		const output = 'ccPack.tar';
		const pack = new Package({Path: 'artifacts', Label});
		await pack.pack(srcRoot, output);
		fs.unlinkSync(output);

	});
});
