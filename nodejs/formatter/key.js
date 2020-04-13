const path = require('path');

/**
 * visualizer class for ECDSA_Key
 */
class ECDSA_Key {
	/**
	 * @param {ECDSA_KEY} key could be either private or public Key
	 * @param {NodeModule} [fs]
	 */
	constructor(key, fs) {
		if (key.constructor.name !== 'ECDSA_KEY') {
			const err = Error('not ECDSA Key');
			err.key = key;
			throw err;
		}
		this._key = key;
		this.fs = fs;
	}

	/**
	 *
	 * @return {PEM}
	 */
	pem() {
		return this._key.toBytes().trim();
	}


	save(filePath) {
		const data = this.pem();
		if (this.fs && typeof this.fs.outputFileSync === 'function') {
			this.fs.outputFileSync(filePath, data);
		} else {
			const fs = require('fs');
			fs.writeFileSync(filePath, data);
		}
	}
}

class ECDSA_PrvKey extends ECDSA_Key {
	/**
	 * fabric private key raw PEM filename
	 * @return {string}
	 */
	filename() {
		const {prvKeyHex} = this._key._key;
		if (!prvKeyHex) {
			throw Error('not private key');
		}
		return `${prvKeyHex}_sk`;
	}

	toKeystore(dirName) {
		const filename = this.filename();
		const absolutePath = path.resolve(dirName, filename);
		this.save(absolutePath);
	}
}

module.exports = {
	ECDSA_Key,
	ECDSA_PrvKey
};