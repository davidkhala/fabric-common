const os = require('os');
const logger = require('./logger').new('helper util');
exports.randomKeyOf = (obj) => {
	const keys = Object.keys(obj);
	const keyIndex = Math.floor(Math.random() * Math.floor(keys.length));
	return keys[keyIndex];
};
exports.JSONReadable = (data) => JSON.stringify(data, null, 2);
exports.JSONEqual = (json1, json2) => {
	return JSON.stringify(JSON.parse(json1)) === JSON.stringify(JSON.parse(json2));
};
exports.ips = () => {
	const allInterfaces = os.networkInterfaces();
	const ips = [];
	for (const interfaceName in allInterfaces) {
		if (interfaceName.includes('docker')) continue;
		const Interface = allInterfaces[interfaceName];
		for (const each of Interface) {
			if (each.family === 'IPv4' && !each.internal) {
				ips.push(each.address);
			}
		}
	}
	return ips;
};
exports.ip = () => {
	const ips = exports.ips();
	if (ips.length === 1) {
		return ips[0];
	} else if (ips.length > 1) {
		throw `multiple ip found ${ips}`;
	} else {
		throw 'no ip found';
	}
};
exports.hostname = os.hostname;

exports.sha2_256 = require('fabric-client/lib/hash').sha2_256;

exports.sleep = (ms) => {
	logger.info(`sleep ${ms}ms`);
	return new Promise(resolve => setTimeout(resolve, ms));
};