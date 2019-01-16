const {PeerLedger} = require('../leveldb');
const rootPath = '/home/mediconcen/Documents/backupVolumes/peer0.delphi';
const peerLedger = new PeerLedger(rootPath);
const logger = require('../logger').new('test:peerLedger', true);
const flow = async () => {
	logger.debug(peerLedger.statePath.chaincodes());
	const {stateLeveldb} = peerLedger.statePath.ledgersData;
	await stateLeveldb.connect();
	const rawList = await stateLeveldb.list();
	logger.debug('stateLeveldb', rawList.filter(({key, value}) => PeerLedger.filter.stateLeveldb({
		key,
		value
	}, {channel: 'allchannel', chaincodeId: 'diagnose'})));
	await stateLeveldb.disconnect();
};
flow();

