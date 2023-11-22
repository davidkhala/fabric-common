import fs from 'fs';
import {HSMSuite} from 'khala-fabric-admin/cryptoSuite.js';

const commonPKCSPaths = [
	'/usr/lib/softhsm/libsofthsm2.so',								// Ubuntu
	'/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so',				// Ubuntu  apt-get install
	'/usr/local/lib/softhsm/libsofthsm2.so',						// Ubuntu, OSX (tar ball install)
	'/usr/lib64/pkcs11/libsofthsm2.so', // centos: option 1
	'/usr/lib64/softhsm/libsofthsm.so' // centos: option 2
];
export const availablePKCSLibs = commonPKCSPaths.filter((lib) => fs.existsSync(lib));

export const newHSMCryptoSuite = ({lib = availablePKCSLibs[0], slot, pin}) => {
	return HSMSuite({lib, slot, pin});
};
