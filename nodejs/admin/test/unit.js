const taskPeer = async () => {
	const Peer = require('../peer');

	const peer = new Peer({peerPort: 7051, pem: '-', host: 'localhost'});
	console.debug(peer.isTLS());
};
const task = async () => {
	switch (parseInt(process.env.taskID)) {
		default:
			taskPeer();
	}
};
task();