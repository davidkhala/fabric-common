const logger = require('./logger').new('helper util');
const {ips} = require('../docker/nodejs/helper');
exports.randomKeyOf = (obj) => {
	const keys = Object.keys(obj);
	const keyIndex = Math.floor(Math.random() * Math.floor(keys.length));
	return keys[keyIndex];
};
exports.JSONReadable = (data) => JSON.stringify(data, null, 2);
exports.JSONEqual = (json1, json2) => {
	return JSON.stringify(JSON.parse(json1)) === JSON.stringify(JSON.parse(json2));
};

exports.ip = () => {
	const ips = ips();
	if (ips.length === 1) {
		return ips[0];
	} else if (ips.length > 1) {
		throw `multiple ip found ${ips}`;
	} else {
		throw 'no ip found';
	}
};

exports.sha2_256 = require('fabric-client/lib/hash').SHA2_256;

exports.sleep = async (ms) => {
	logger.info(`sleep ${ms}ms`);
	return new Promise(resolve => setTimeout(resolve, ms));
};
const util = require('util');
exports.exec = util.promisify(require('child_process').exec);