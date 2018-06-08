const os = require('os');
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
exports.hostname = os.hostname;