const path = require('path');
const logFile = path.resolve(__dirname, 'debug.log');
const logger = require('khala-nodeutils/logger').newFile('logFile', logFile);
logger.debug(' a new message');