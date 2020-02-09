const {getActionSet} = require('../systemChaincode');
const task = async (systemChaincode) => {
	const actionsSet = getActionSet(systemChaincode);
	console.log(`${systemChaincode} action set`, actionsSet);
};
task('lscc');



