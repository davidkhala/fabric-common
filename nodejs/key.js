/**
 * visualizer class for ECDSA_Key
 */
class ECDSA_PRIV {
	constructor(key) {
		if (key.constructor.name !== 'ECDSA_KEY') {
			const err = Error('not ECDSA Key');
			err.key = key;
			throw err;
		}
		this._key = key;
	}

	pem() {
		return this._key.toBytes();
	}

	filename() {
		return `${this._key._key.prvKeyHex}_sk`;
	}

}

module.exports = ECDSA_PRIV;