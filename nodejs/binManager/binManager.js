import path from 'common/nodejs/path.js';
import fs from 'fs';
import {isDirectory} from '@davidkhala/light/file.js';

const expectedBinaries = [
	'configtxgen', 'configtxlator', 'cryptogen', 'discover', 'fabric-ca-client', 'fabric-ca-server', 'ledgerutil', 'orderer', 'osnadmin', 'peer'
];

export default class BinManager {
	/**
	 *
	 * @param binPath
	 * @param [logger]
	 */
	constructor(binPath = process.env.binPath, logger = console) {
		if (!binPath) {
			throw Error('BinManager: environment <binPath> is undefined');
		}
		if (!isDirectory(binPath)) {
			throw Error('BinManager: environment <binPath> is not a directory');
		}
		const files = fs.readdirSync(binPath);

		expectedBinaries.every(value => {
			if (!files.includes(value)) {
				throw Error(`binary ${value} not found in binPath ${binPath}`);
			}
		});

		Object.assign(this, {logger, binPath});
	}

	/**
	 * @abstract
	 */
	get executable() {
		return '';
	}

	_buildCMD(...args) {
		return `${path.resolve(this.binPath, this.executable)} ${args.join(' ')}`;
	}

}
