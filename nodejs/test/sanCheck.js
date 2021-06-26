const {CommonJSRequireSmoke} = require('khala-light-util/testUtil');
const path = require('path');
describe('san check', () => {
	it('include all', () => {
		const rootPath = path.resolve(__dirname, '../');

		console.debug(rootPath);
		CommonJSRequireSmoke(rootPath);

	});
});