exports.randomKeyOf = (obj) => {
	const keys = Object.keys(obj);
	const keyIndex = Math.floor(Math.random() * Math.floor(keys.length));
	return keys[keyIndex];
};
exports.JSONReadable = (data) => JSON.stringify(data, null, 2);