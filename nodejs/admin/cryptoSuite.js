const Utils = require('fabric-common/lib/Utils');
/**
 *
 * @return {ICryptoSuite}
 */
exports.emptySuite = () => {
	return Utils.newCryptoSuite();
};

/**
 * TODO
 * @param {string} lib library path, such as '/usr/lib/softhsm/libsofthsm2.so'
 * @param {integer} slot
 * @param {string} pin password
 * @return {Client.ICryptoSuite}
 */
// exports.HSMSuite = ({lib, slot, pin}) => {
// 	const defaultValue = Utils.getConfigSetting('crypto-suite-hsm');
// 	Utils.setConfigSetting('crypto-suite-hsm', {
// 		'EC': 'fabric-client/lib/impl/bccsp_pkcs11.js'
// 	});
// 	const result = Utils.newCryptoSuite({software: false, lib, slot, pin, keysize: 256, hash: 'SHA2'}); // software false to use HSM
// 	Utils.setConfigSetting('crypto-suite-hsm', defaultValue);
// 	return result;
// };