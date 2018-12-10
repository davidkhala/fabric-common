const helper = require('../helper');
const logger= require('../logger').new('test:helper',true)
const hashed = helper.sha2_256('abc');
logger.info(hashed);