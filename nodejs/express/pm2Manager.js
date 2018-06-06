const pm2 = require('pm2');
const logger = require('../logger').new('pm2 Manager');
exports.run = async ({name, script, env}) => {
	let process = await exports.get({name}, true);
	if (process) {
		logger.warn(`process ${name} exist`);
	} else {
		process = await new Promise((resolve, reject) => {
			pm2.start({name, script, env}, (err, process) => {
				if (err) reject(err);
				resolve(process);
			});
		});
	}
	pm2.disconnect();
	return process;
};
exports.get = async ({name}, persist) => {

	const list = await new Promise((resolve, reject) => {
		pm2.list((err, list) => {
			if (err) reject(err);
			resolve(list.find(({name: pName}) => pName === name));
		});
	});
	if (!persist) {
		pm2.disconnect();
	}
	return list;
};
exports.kill = async ({name}) => {
	const exist = await exports.get({name}, true);
	if (!exist) {
		logger.warn(`process ${name} not exist, delete skipped`);
	} else {
		await new Promise((resolve, reject) => {
			pm2.delete(name, (err) => {
				if (err) reject(err);
				resolve();
			});
		});
	}
	pm2.disconnect();
};
