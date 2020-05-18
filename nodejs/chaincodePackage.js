const {ChaincodeType} = require('khala-fabric-formatter/chaincode');
const {createTmpDir} = require('khala-nodeutils/tmp');
const fs = require('fs');
const path = require('path');
const compress = require('compressing');

class ChaincodePackage {
	/**
	 *
	 * @param [Path]
	 * @param {ChaincodeType} [Type]
	 * @param Label
	 */
	constructor({Path, Type, Label}) {
		if (!Type) {
			Type = ChaincodeType.golang;
		}
		Object.assign(this, {Path, Type, Label});
	}

	async pack(chaincodeRoot, output) {
		const [tmpRoot, t1] = createTmpDir();
		const {Path, Type, Label} = this;
		fs.writeFileSync(path.resolve(tmpRoot, 'metadata.json'), JSON.stringify({Path, Type, Label}));

		const codeTarCompressOpts = {
			ignoreBase: true
		};
		if (this.Type === ChaincodeType.golang) {
			codeTarCompressOpts.relativePath = path.join('src', this.Path);
		}
		await compress.tgz.compressDir(chaincodeRoot, path.resolve(tmpRoot, 'code.tar.gz'), codeTarCompressOpts);
		await compress.tgz.compressDir(tmpRoot, output, {
			ignoreBase: true
		});
		t1();
	}
}

module.exports = ChaincodePackage;