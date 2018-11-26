const helper = require('../helper');
const hashed = helper.sha2_256('abc');
console.log(hashed);