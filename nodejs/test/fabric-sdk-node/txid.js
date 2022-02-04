import Utils from 'fabric-common/lib/Utils';
import assert from 'assert';
describe('test sdk itself', () => {
	it('getNonce', () => {
		const nonce = Utils.getNonce();
		assert.ok(nonce instanceof Buffer);
		assert.strictEqual(nonce.length, 24);
	});
});