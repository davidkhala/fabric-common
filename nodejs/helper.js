exports.sha2_256 = require('fabric-client/lib/hash').SHA2_256;


/**
 * @deprecated use khala-nodeutils
 *
 */
const util = require('util');
exports.exec = util.promisify(require('child_process').exec);