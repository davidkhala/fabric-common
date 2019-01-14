const peerUrl = 'http://localhost:9443';
const ordererUrl = 'http://localhost:8443';
const peerUtil = require('../peer');
const logger = require('../logger').new('test:peer', true);
const flow = async () => {
	let isHealth, logLevel;
	isHealth = await peerUtil.health(peerUrl);
	logLevel = await peerUtil.getLogLevel(peerUrl);
	logger.info(peerUrl, isHealth, logLevel);
	isHealth = await peerUtil.health(ordererUrl);
	logLevel = await peerUtil.getLogLevel(ordererUrl);
	logger.info(ordererUrl, isHealth, logLevel);
};
flow();