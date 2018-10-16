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
	const sort = []; //see in http://docs.couchdb.org/en/stable/api/database/find.html#sort-syntax

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