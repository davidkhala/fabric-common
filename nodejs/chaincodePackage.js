const {ChaincodeType} = require('khala-fabric-formatter/chaincode');
const fs = require('fs');
const path = require('path');

class ChaincodePackage {
	/**
	 *
	 * @param {string} Path
	 * @param {ChaincodeType} [Type]
	 * @param {string} Label
	 */
	constructor({Path, Type, Label}) {
		if (!Type) {
			Type = ChaincodeType.golang;
		}
		Object.assign(this, {Path, Type, Label});
	}

	/**
	 *
	 * @param {string} output File path
	 * @param {BinManager} [binManager]
	 */
	async pack(output, binManager) {
		const {Path, Type, Label} = this;
		if (binManager) {
			await binManager.peer().lifecycle.package({Type, Label, Path}, output);
		} else {
			const {createTmpDir} = require('khala-nodeutils/tmp');
			const compress = require('compressing');
			const [tmpRoot, t1] = createTmpDir();
			fs.writeFileSync(path.resolve(tmpRoot, 'metadata.json'), JSON.stringify({Type, Label}));

			const codeTarCompressOpts = {
				ignoreBase: true
			};
			codeTarCompressOpts.relativePath = path.join('src');
			await compress.tgz.compressDir(Path, path.resolve(tmpRoot, 'code.tar.gz'), codeTarCompressOpts);
			await compress.tgz.compressDir(tmpRoot, output, {
				ignoreBase: true
			});
			t1();
		}

	}
}

module.exports = ChaincodePackage;
