const Utils = require('fabric-common/lib/Utils');
/**
 *
 * @return {ICryptoSuite}
 */
exports.emptySuite = () => {
	return Utils.newCryptoSuite();
};
exports.HSMSuite = ({lib, slot, pin}) => {
	return Utils.newCryptoSuite({software: false, lib, slot, pin, keysize: 256, hash: 'SHA2'}); // software false to use HSM
};
