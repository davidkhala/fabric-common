const {getActionSet} = require('../systemChaincode');
const logger = require('khala-logger/log4js').consoleLogger('test:chaincode');
describe('system chaincode', () => {
	it('getActionSet', () => {
		const systemChaincode = 'lscc';
		const actionsSet = getActionSet(systemChaincode);
		logger.info(`${systemChaincode} action set`, actionsSet);
	});

});




