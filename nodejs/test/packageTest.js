const Package = require('../chaincodePackage');
const {homeResolve} = require('khala-light-util');
const fs = require('fs');
describe('package', () => {
	it('pack', async () => {
		const srcRoot = homeResolve('go/src/github.com/davidkhala/chaincode/golang/diagnose/');
		const Label = 'ccID';
		const output = 'ccPack.tar';
		const pack = new Package({Path: 'github.com/davidkhala/chaincode/golang/diagnose', Label});
		await pack.pack(srcRoot, output);
		fs.unlinkSync(output);

	});
});
