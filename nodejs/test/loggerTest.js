const path = require('path');
const logFile = path.resolve(__dirname, 'debug.log');
const Logger = require('khala-nodeutils/logger');
const label = 'test';
const fileLogger = Logger.newFile(label, logFile);
fileLogger.debug(' a new message');
const logger = Logger.new(label);
logger.debug('console ');