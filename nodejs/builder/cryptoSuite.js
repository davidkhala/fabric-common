const Utils = require('fabric-client/lib/utils');
/**
 *
 * @return {Client.ICryptoSuite}
 */
exports.emptySuite = () => {
	return Utils.newCryptoSuite();
};

/**
 *
 * @param {string} lib library path, such as '/usr/lib/softhsm/libsofthsm2.so'
 * @param {integer} slot
 * @param {string} pin password
 * @return {Client.ICryptoSuite}
 */
exports.HSMSuite = ({lib, slot, pin}) => {
	return Utils.newCryptoSuite({software: false, lib, slot, pin}); // software false to use HSM
};