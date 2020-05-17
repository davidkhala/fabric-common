const Package = require('../chaincodePackage');
const path = require('path');
const task = async () => {
	switch (parseInt(process.env.taskID)) {
		case 0: {
			const srcRoot = path.resolve(__dirname, 'artifacts');
			const Label = 'ccID';
			const output = 'ccPack.tar';
			const pack = new Package({Label});
			await pack.pack(srcRoot, output);
		}
			break;
		case 1:
			break;
		default:
			console.error('???');
	}
};
task();