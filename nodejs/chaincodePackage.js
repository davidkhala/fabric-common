const {ChaincodeType} = require('khala-fabric-formatter/chaincode');
const fs = require('fs');
const {isDirectory, execSync} = require('khala-light-util/index');
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
			let modulePath;
			switch (Type) {
				case ChaincodeType.golang:
					modulePath = JSON.parse(execSync(`cd ${Path} && go mod edit -json`)).Module.Path;
					break;
				case ChaincodeType.node:
					modulePath = Path;
					break;
			}
			fs.writeFileSync(path.resolve(tmpRoot, 'metadata.json'), JSON.stringify({path: modulePath, type: Type, label: Label}));

			const couchdbDir = path.resolve(Path, 'META-INF', 'statedb', 'couchdb');
			if (isDirectory(couchdbDir)) {
				const [tmpRoot2, t2] = createTmpDir();

				const fsExtra = require('fs-extra');

				fsExtra.moveSync(path.resolve(Path, 'META-INF'), path.resolve(tmpRoot2, 'META-INF'));// NOTE: The move operation eliminate the META-INF autogen footprint
				fsExtra.copySync(Path, path.resolve(tmpRoot2, 'src'));
				await compress.tgz.compressDir(tmpRoot2, path.resolve(tmpRoot, 'code.tar.gz'), {
					ignoreBase: true,
				});

				t2();
			} else {
				await compress.tgz.compressDir(Path, path.resolve(tmpRoot, 'code.tar.gz'), {
					ignoreBase: true,
					relativePath: 'src'
				});
			}


			await compress.tgz.compressDir(tmpRoot, output, {
				ignoreBase: true
			});
			t1();
		}

	}
}

module.exports = ChaincodePackage;
