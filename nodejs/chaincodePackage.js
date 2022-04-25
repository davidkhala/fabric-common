import {ChaincodeType} from 'khala-fabric-formatter/chaincode.js';

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

	calculateId(chaincodeArchive, binManager) {
		const out = binManager.peer().lifecycle.packageid(chaincodeArchive);
		return out.trim();
	}

	/**
	 *
	 * @param {string} output File path
	 * @param {BinManager} binManager
	 */
	async pack(output, binManager) {
		const {Path, Type, Label} = this;

		await binManager.peer().lifecycle.package({Type, Label, Path}, output);

	}
}
