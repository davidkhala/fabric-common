const pm2 = require('pm2');
const logger = require('../logger').new('pm2 Manager');
exports.run = async ({name, script, env}) => {
	const exist = await exports.get({name});
	if (exist) {
		logger.warn(`process ${name} exist`);
		return exist;
	}
	return await new Promise((resolve, reject) => {
		pm2.start({name, script, env}, (err, process) => {
			if (err) reject(err);
			resolve(process);
		});
	});
};
exports.get = ({name}) => {
	return new Promise((resolve, reject) => {
		pm2.list((err, list) => {
			if (err) reject(err);
			resolve(list.find(({name: pName}) => pName === name));
		});
	});
};
exports.kill = async ({name}) => {
	const exist = await exports.get({name});
	if (!exist) {
		logger.warn(`process ${name} not exist, delete skipped`);
		return;
	}
	return await new Promise((resolve, reject) => {
		pm2.delete(name, (err) => {
			if (err) reject(err);
			resolve();
		});
	});
};
