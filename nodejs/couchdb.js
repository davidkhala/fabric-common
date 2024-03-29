import path from 'path';
import fsExtra from 'fs-extra';
export const envBuilder = (user, password, clusterOpt) => {
	let env = [`COUCHDB_USER=${user}`, `COUCHDB_PASSWORD=${password}`];
	if (clusterOpt) {
		// TODO couchdb cluster
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
export const queryBuilder = (selector = {}, sorts = [], direction = 0, limit = 25) => {
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

/**
 * overwrite couchdb index file
 * @param {string} metaINFPath file path
 * @param {string} [collection] work as a private data collection if specified, otherwise as common state data
 * @param {string} [fileName] should ends with ".json" default: index.json
 * @param {string} [fields] sorting fields
 */
export const couchDBIndex = (metaINFPath, collection, fileName, ...fields) => {
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
	let target;
	if (collection) {
		target = path.resolve(metaINFPath, 'statedb', 'couchdb', 'collections', collection, 'indexes', fileName);
	} else {
		target = path.resolve(metaINFPath, 'statedb', 'couchdb', 'indexes', fileName);
	}

	const object = {
		index: {
			fields
		},
		type: 'json'
	};
	fsExtra.outputJsonSync(target, object);
};