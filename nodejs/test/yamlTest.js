const {yaml, devLogger} = require('../helper').nodeUtil;
const logger = devLogger('yaml');

const path = require('path');
const configtxFile = path.resolve(__dirname, '../../config/configtx.yaml');
const configtxObj = yaml.read(configtxFile);
logger.debug(Object.keys(configtxObj.Profiles));
