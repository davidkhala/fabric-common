const LevelDB = require('khala-nodeutils/leveldb');
const {statePath} = require('./peer');
const path = require('path');

const fs = require('fs');

class PeerLevelDBs {
	constructor(rootPath) {
		this.root = path.resolve(rootPath);
		const ledgersDataPath = path.resolve(rootPath, 'ledgersData');
		this.statePath = {
			chaincodes: () => {
				const chaincodesDir = path.resolve(this.root, 'chaincodes');
				return fs.readdirSync(chaincodesDir).map(file => {
					const [chaincodeId, chaincodeVersion] = file.split(/\.(.+)/);
					// diagnose.0.0.0
					return {chaincodeId, chaincodeVersion};
				});
			},
			ledgersData: {
				bookkeeper: new LevelDB(path.resolve(ledgersDataPath, 'bookkeeper')), // leveldb
				chains: {
					chains: [], // channel names // allchannel/blockfile_000000
					index: new LevelDB(path.resolve(ledgersDataPath, 'chains', 'index'))// leveldb
				},
				configHistory: new LevelDB(path.resolve(ledgersDataPath, 'configHistory')), // leveldb
				historyLeveldb: new LevelDB(path.resolve(ledgersDataPath, 'historyLeveldb')), // leveldb
				ledgerProvider: new LevelDB(path.resolve(ledgersDataPath, 'ledgerProvider')), // leveldb
				pvtdataStore: new LevelDB(path.resolve(ledgersDataPath, 'pvtdataStore')), // leveldb
				stateLeveldb: new LevelDB(path.resolve(ledgersDataPath, 'stateLeveldb')) // leveldb
			},
			transientStore: {}// leveldb
		};
	}
}

PeerLevelDBs.filter = {
	stateLeveldb: ({key, value}, {channel, chaincodeId}) => {
		const keyTokens = key.split('\u0000');
		if (channel && keyTokens[0] !== channel) {
			return false;
		}
		if (chaincodeId && keyTokens[1] !== chaincodeId) {
			return false;
		}
		return true;
	}
};

exports.PeerLedger = PeerLevelDBs;