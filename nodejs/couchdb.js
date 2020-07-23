exports.envBuilder = (user, password, clusterOpt) => {
	let env = [`COUCHDB_USER=${user}`, `COUCHDB_PASSWORD=${password}`];
	if (clusterOpt) {
		const {nodeName, flag} = clusterOpt;
		env = env.concat([
			`NODENAME=${nodeName}`,
			`ERL_FLAGS=-setcookie "${flag}"`
		]);
	}
	return env;
};
/**
 * query syntax http://docs.couchdb.org/en/stable/api/database/find.html
 * @param {Object} selector js object, see in http://docs.couchdb.org/en/stable/api/database/find.html#find-selectors
 * @param {Array<string>} sorts see in http://docs.couchdb.org/en/stable/api/database/find.html#sort-syntax
 * @param {int} direction 0 to use "asc"(default); 1 to use "desc"
 * @param {number} limit Maximum number of results returned
 * @returns {string}
 */
exports.queryBuilder = (selector = {}, sorts = [], direction = 0, limit = 25) => {
	const sort = [];
	const directions = ['asc', 'desc'];
	for (const sortCol of sorts) {
		sort.push({[sortCol]: directions[direction]});
		selector[sortCol] = {
			'$gt': null
		};
	}
	const query = {
		selector,
		sort,
		limit
	};
	return JSON.stringify(query);
};

const path = require('path');
const fsExtra = require('fs-extra');
/**
 * overwrite couchdb index file
 * @param {string} metaINFPath file path
 * @param {string} fileName should ends with ".json" default: index.json
 * @param {string} fields sorting fields
 */
exports.couchDBIndex = (metaINFPath, fileName, ...fields) => {
	if (!fileName) {
		fileName = 'index.json';
	} else {
		if (!fileName.endsWith('.json')) {
			const err = Error(
				`fileName should endsWith ".json", but got ${fileName}`
			);
			err.code = 'couchdb';
			throw err;
		}
	}
	const target = path.resolve(metaINFPath, 'statedb', 'couchdb', 'indexes', fileName);
	const object = {
		index: {
			fields
		},
		type: 'json'
	};
	fsExtra.outputJsonSync(target, object);
};