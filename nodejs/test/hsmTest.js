const HSM = require('../hsm');
const logger = require('../logger').new('test:hsm', true);
logger.info('libs', HSM.availablePKCSLibs);

/**
 * Test generate ephemeral ECDSA key pair, sign, and verify
 * @return {Promise<void>}
 * @constructor
 */
const ECDSATask = async (cryptoSuite, ephemeral) => {

	const message = Buffer.from('hello');
	const key = await cryptoSuite.generateKey({algorithm: 'ECDSA', ephemeral});
	const sig = cryptoSuite.sign(key, message, null);
	const verifyResult = cryptoSuite.verify(key, sig, message);
	logger.info('ECDSATask:verifyResult', verifyResult);
};

const task = async () => {
	const slot = 0;
	const pin = 'fabric';
	const cryptoSuite = HSM.newHSMCryptoSuite({slot, pin});
	await ECDSATask(cryptoSuite, true);
};
task();
