const LevelDB = require('khala-nodeutils/leveldb');

const {statePath} = require('./peer');

class PeerLevelDBs {
	constructor(rootPath) {
		this.statePah = statePath
		// this.statePah.chaincodes fixme
	}
}