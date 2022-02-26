import fs from 'fs';
import CryptoSuite from 'khala-fabric-admin/cryptoSuite.js';
const commonPKCSPaths = [
	'/usr/lib/softhsm/libsofthsm2.so',								// Ubuntu
	'/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so',				// Ubuntu  apt-get install
	'/usr/local/lib/softhsm/libsofthsm2.so'						// Ubuntu, OSX (tar ball install)
];
export const availablePKCSLibs = commonPKCSPaths.filter((lib) => fs.existsSync(lib));

export const newHSMCryptoSuite = ({lib = availablePKCSLibs[0], slot, pin}) => {
	return CryptoSuite.HSMSuite({lib, slot, pin});
};
