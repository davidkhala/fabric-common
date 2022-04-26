import fs from 'fs';
import {ChaincodeType} from 'khala-fabric-formatter/chaincode.js';
import {sha2_256} from 'khala-fabric-formatter/helper.js';
import {execSync} from '@davidkhala/light/devOps.js';

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

	calculateID(chaincodeArchive, binManager, bash) {
		if (bash) {
			const cmd = `sha256sum ${chaincodeArchive} | awk '{print $1}'`
			const hash = execSync(cmd);
			return `${this.Label}:${hash.trim()}`;
		}
		if (binManager) {
			const out = binManager.peer().lifecycle.packageID(chaincodeArchive);
			return out.trim();
		} else {
			return `${this.Label}:${sha2_256(fs.readFileSync(chaincodeArchive))}`;
		}

	}

	/**
	 * TODO No pure js alternative yet
	 * @param {string} output File path
	 * @param {BinManager} binManager
	 */
	pack(output, binManager) {
		const {Path, Type, Label} = this;

		binManager.peer().lifecycle.package({Type, Label, Path}, output);

	}
}
