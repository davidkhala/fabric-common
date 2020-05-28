const peerUrl = 'https://localhost:9443';
const ordererUrl = 'https://localhost:8443';
const OperationService = require('../operations');
const logger = require('khala-logger/log4js').consoleLogger('test:operation');
const task = async () => {
	let isHealth;
	const httpsOptions = {rejectUnauthorized: false, json: true};
	const service = new OperationService(peerUrl, httpsOptions);
	isHealth = await service.health();
	logger.info(peerUrl, isHealth);
	isHealth = await service.health();
	logger.info(ordererUrl, isHealth);

};
task().catch(err => {
	logger.error(err);
});
