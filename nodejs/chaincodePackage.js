import fs from 'fs';
import {ChaincodeType} from 'khala-fabric-formatter/chaincode.js';
import {sha2_256} from 'khala-fabric-formatter/helper.js';
import {execSync} from '@davidkhala/light/devOps.js';
import {createTmpDir} from '@davidkhala/nodeutils/tmp.js';
import path from 'path';
import {isDirectory} from '@davidkhala/light';
import fsExtra from 'fs-extra';
import {create} from '@davidkhala/compress/npm-tar.js';

export default class ChaincodePackage {
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
	 * @param chaincodeArchive
	 * @param [binManager]
	 * @param [bash]
	 * @returns {string}
	 */
	calculateID(chaincodeArchive, binManager, bash) {
		if (bash) {
			const cmd = `sha256sum ${chaincodeArchive} | awk '{print $1}'`;
			const hash = execSync(cmd);
			return `${this.Label}:${hash.trim()}`;
		}
		if (binManager) {
			const out = binManager.peer().lifecycle.packageID(chaincodeArchive);
			return out.trim();
		}
		return `${this.Label}:${sha2_256(fs.readFileSync(chaincodeArchive))}`;

	}

	/**
	 * @param {string} output File path
	 * @param {BinManager} [binManager]
	 */
	pack(output, binManager) {
		const {Path, Type, Label} = this;
		if (ChaincodeType[Type] && binManager) {
			binManager.peer().lifecycle.package({Type, Label, Path}, output);
			return this.calculateID(output, binManager)
		} else {
			// `$peer lifecycle package` cannot handle external chaincodeType, which is required in ccaasbuilder
			// Error: failed to normalize chaincode path: unknown chaincodeType: EXTERNAL

			const [tmpRoot, t1] = createTmpDir();

			// Path is not required in external chaincode
			fs.writeFileSync(path.resolve(tmpRoot, 'metadata.json'), JSON.stringify({type: Type, label: Label}));

			const couchdbDir = path.resolve(Path, 'META-INF', 'statedb', 'couchdb');
			const [tmpRoot2, t2] = createTmpDir();

			if (isDirectory(couchdbDir)) {

				/**
				 * NOTE: The move operation eliminate the META-INF autogen footprint
				 */
				fsExtra.moveSync(path.resolve(Path, 'META-INF'), path.resolve(tmpRoot2, 'META-INF'));

			}
			fsExtra.copySync(Path, path.resolve(tmpRoot2, 'src'));
			create(tmpRoot2, path.resolve(tmpRoot, 'code.tar.gz'), {portable: true});
			t2();
			create(tmpRoot, output, {portable: true});
			t1();
			return this.calculateID(output)
		}


	}
}
