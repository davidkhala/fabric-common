const peerUrl = 'https://localhost:9443';
const ordererUrl = 'https://localhost:8443';
const operationUtil = require('../operations');
const logger = require('../logger').new('test:operation', true);
const task = async () => {
	let isHealth;
	const httpsOptions = {rejectUnauthorized: false, json: true};
	isHealth = await operationUtil.health(peerUrl, httpsOptions);
	logger.info(peerUrl, isHealth);
	isHealth = await operationUtil.health(ordererUrl, httpsOptions);
	logger.info(ordererUrl, isHealth);

};
task().catch(err => {
	logger.error(err);
});