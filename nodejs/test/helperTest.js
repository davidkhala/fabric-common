import {sha2_256} from '../formatter/helper.js';
import assert from 'assert';

describe('helper', () => {
	it('hash', () => {
		const hashed = sha2_256('abc');
		const digest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
		assert.strictEqual(hashed, digest);
	});
});

