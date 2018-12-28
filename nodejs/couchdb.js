exports.envBuilder = (user = '', password = '') => {
	return [`COUCHDB_USER=${user}`, `COUCHDB_PASSWORD=${password}`];
};
/**
 * query syntax http://docs.couchdb.org/en/stable/api/database/find.html
 * @param {Array<string>} sorts
 * @param {int} direction 0 to use "asc"(default); 1 to use "desc"
 * @returns {string}
 */
exports.queryBuilder = (sorts = [], direction = 0) => {

	const selector = {};
	const sort = []; // see in http://docs.couchdb.org/en/stable/api/database/find.html#sort-syntax

	const directions = ['asc', 'desc'];
	for (const sortCol of sorts) {
		sort.push({[sortCol]: directions[direction]});
		selector[sortCol] = {
			'$gt': null
		};
	}
	const query = {
		selector,
		sort
	};
	return JSON.stringify(query);
};

const path = require('path');
const fsExtra = require('khala-nodeutils/helper').fsExtra;
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
			const err = Error(`fileName should endsWith ".json", but got ${fileName}`);
			err.code = 'couchdb';
			throw err;
		}
	}
	const target = path.resolve(metaINFPath, 'statedb', 'couchdb', 'indexes', fileName);
	const object = {
		index: {
			fields,
			type: 'json'
		}
	};
	fsExtra.outputJsonSync(target, object);
};