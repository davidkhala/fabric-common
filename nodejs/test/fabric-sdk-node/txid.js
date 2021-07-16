const Utils = require('fabric-common/lib/Utils');
const assert = require('assert');
describe('test sdk itself', () => {
	it('getNonce', () => {
		const nonce = Utils.getNonce();
		assert.ok(nonce instanceof Buffer);
		assert.strictEqual(nonce.length, 24);
	});
});