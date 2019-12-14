// TODO it is not included in 1.4.4, but in release 1.4

const stream = require('stream');

class BufferStream extends stream.PassThrough {

	constructor() {
		super();
		this.buffers = [];
		this.on('data', (chunk) => {
			this.buffers.push(chunk);
		});
	}

	toBuffer() {
		return Buffer.concat(this.buffers);
	}

}

module.exports = BufferStream;