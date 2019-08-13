const {nodeUtil} = require('../helper');
const yaml = nodeUtil.yaml();
const logger = nodeUtil.devLogger('yaml');

const path = require('path');
const configtxFile = path.resolve(__dirname, '../../config/configtx.yaml');
const configtxObj = yaml.read(configtxFile);
logger.debug(configtxObj.Profiles);