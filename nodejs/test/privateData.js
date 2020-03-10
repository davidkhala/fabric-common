const {ensureCollectionConfig, collectionPolicyBuilder} = require('../privateData');
const policy = collectionPolicyBuilder(['orgMSP']);
const config = {
	name: 'org',
	policy,
	maxPeerCount: 1,
	requiredPeerCount: 0
};
const convertedConfig = ensureCollectionConfig(config);
console.log(convertedConfig);