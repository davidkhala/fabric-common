const Package = require('../chaincodePackage');
const path = require('path');
const task = async () => {
	switch (parseInt(process.env.taskID)) {
		case 0: {
			const srcRoot = '/home/davidliu/go/src/github.com/davidkhala/chaincode/golang/diagnose/';
			const Label = 'ccID';
			const output = 'ccPack.tar';
			const pack = new Package({Path: 'github.com/davidkhala/chaincode/golang/diagnose', Label});
			await pack.pack(srcRoot, output);
		}
			break;
		case 1:
			break;
		default:
	}
};
task();