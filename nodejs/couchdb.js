exports.envBuilder = (user='',password='') => {
	return [`COUCHDB_USER=${user}`,`COUCHDB_PASSWORD=${password}`]
};
