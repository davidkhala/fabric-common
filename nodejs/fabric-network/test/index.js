const path = require('path');
const {getSampleUser} = require('./testUtil');
describe('smoke', async () => {
	it('requireAll', () => {
		const {CommonJSRequireSmoke} = require('khala-light-util/testUtil');
		const libRoot = path.resolve(__dirname, '../');
		CommonJSRequireSmoke(libRoot);
	});
});
describe('unit', async () => {
	describe('gateway:', () => {
		const GatewayManager = require('../gateway');

		let gatewayManager;
		it('constructor', async () => {
			const user = getSampleUser();

			gatewayManager = new GatewayManager(user);
			await gatewayManager.connect('allchannel', undefined, undefined, undefined, undefined);
		});

	});
});



