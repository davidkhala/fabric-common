import {createTmpDir} from '@davidkhala/nodeutils/tmp.js';
import fs from 'fs';
import path from 'path';
import {execSync} from '@davidkhala/light/devOps.js';
import BinManager from './binManager.js';

const createTmpCoreYml = () => {
	const [FABRIC_CFG_PATH, t1] = createTmpDir();
	fs.writeFileSync(path.resolve(FABRIC_CFG_PATH, 'core.yml'), '');
	process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;
	return () => {
		t1();
		delete process.env.FABRIC_CFG_PATH;
	};
};

export class peer extends BinManager {

	/**
	 * Signs the supplied configtx update file in place on the filesystem.
	 * [Inline signing] command output file path is same as configtxUpdateFile (overwrite)
	 * @param {string} configtxUpdateFile file path
	 * @param {string} localMspId
	 * @param {string} mspConfigPath
	 */
	signconfigtx(configtxUpdateFile, localMspId, mspConfigPath) {
		const t1 = createTmpCoreYml();
		process.env.CORE_PEER_LOCALMSPID = localMspId;
		process.env.CORE_PEER_MSPCONFIGPATH = mspConfigPath;
		const CMD = this._buildCMD(`channel signconfigtx --file ${configtxUpdateFile}`);
		this.logger.info('CMD', CMD);
		const result = execSync(CMD);
		this.logger.info(result);
		t1();
	}

	get executable() {
		return 'peer';
	}
}

export class lifecycle extends BinManager {
	/**
	 *
	 * @param {ChaincodeType} [Type]
	 * @param {string} Label ChaincodeId
	 * @param {string} Path ChaincodePath
	 * @param {string} outputFile
	 */
	package({Type = 'golang', Label, Path}, outputFile) {
		const t1 = createTmpCoreYml();
		const optionTokens = `--label=${Label} --lang=${Type} --path=${Path}`;
		this.exec('package', optionTokens, outputFile);
		t1();
		return outputFile;
	}

	packageID(chaincodeArchive) {

		const t1 = createTmpCoreYml();
		const result = this.exec(`calculatepackageid ${chaincodeArchive}`);
		t1();
		return result;
	}

	get executable() {
		return 'peer lifecycle chaincode';
	}
}