const path = require('path');
const {getSampleUser} = require('./testUtil');
const fsExtra = require('fs-extra');

describe('copy from ', () => {
	const from = path.resolve(__dirname, '../../../../config/ca-crypto-config/peerOrganizations/icdd/users/Admin@icdd/msp');
	const to = path.resolve(__dirname, './artifacts/msp');
	it('exec', () => {
		fsExtra.removeSync(to);
		fsExtra.copySync(from, to);
	});


});
describe('gateway', () => {
	const GatewayManager = require('../gateway');

	it('constructor', async () => {
		const user = getSampleUser();

		const gatewayManager = new GatewayManager(user);
		await gatewayManager.connect('allchannel', undefined, undefined, undefined, undefined);
	});
});



