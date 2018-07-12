const logger = require('../logger').new('ServerClient');
const {sha2_256} = require('fabric-client/lib/hash');
const fs = require('fs');
const path = require('path');
const {fsExtra} = require('../path');
const Request = require('request');
exports.RequestPromise = ({url, body, method = 'POST', formData}, otherOptions = {json: true}) => {
	return new Promise((resolve, reject) => {
		const opts = Object.assign(otherOptions, {
			method,
			url,
			body,
		});
		if (formData) {
			opts.formData = formData;
		}
		Request(opts, (err, resp, body) => {
			if (err) reject(err);
			resolve(body);
		});
	});
};

//TODO have not cover all API yet
exports.ping = async (serverBaseUrl) => {
	const retryMax = 5;
	let retryCounter = 0;
	const aTry = () => new Promise((resolve, reject) => {
		exports.RequestPromise({
			url: `${serverBaseUrl}/`,
			method: 'GET'
		}).then(body => resolve(body)).catch(err => {
			if (err.code === 'ECONNREFUSED' && retryCounter < retryMax) {
				logger.warn('ping retry', retryCounter);
				setTimeout(() => {
					retryCounter++;
					resolve(aTry());
				}, 200);
			} else reject(err);
		});
	});
	return aTry();

};
exports.leader = {
	update: (serverBaseUrl, {ip, hostname, managerToken, workerToken}) => {
		return exports.RequestPromise({
			url: `${serverBaseUrl}/leader/update`,
			body: {ip, hostname, managerToken, workerToken}
		});

	},
	info: (serverBaseUrl) => {
		return exports.RequestPromise({
			url: `${serverBaseUrl}/leader`,
			method: 'GET'
		});
	},
};
/**
 * Take care fs.write encoding specifically
 * @param serverBaseUrl
 * @param filePath
 * @returns {Promise<any>}
 */
exports.block = async (serverBaseUrl, filePath) => {
	const body = await exports.RequestPromise({
		url: `${serverBaseUrl}/block`,
		method: 'GET'
	});
	logger.debug('check hash ', sha2_256(body));
	fsExtra.outputFileSync(path.resolve(filePath), body, 'binary');
	return filePath;
};
exports.getSignatures = (serverBaseUrl, protoPath) => {
	const formData = {
		proto: fs.createReadStream(protoPath)
	};
	return exports.RequestPromise({
		url: `${serverBaseUrl}/`,//TODO signServerPort might be different
		formData,
	});
};

exports.createOrUpdateOrg = (serverBaseUrl, channelName, MSPID, MSPName, nodeType, {admins, root_certs, tls_root_certs}, skip) => {
	const formData = {
		MSPID, MSPName, nodeType,
		admins: admins.map(path => fs.createReadStream(path)),
		root_certs: root_certs.map(path => fs.createReadStream(path)),
		tls_root_certs: tls_root_certs.map(path => fs.createReadStream(path)),
	};
	if (skip) {
		formData.skip = 'y'; //boolean in formData will trigger  "throw new TypeError('First argument must be a string or Buffer');"
	}
	if (nodeType === 'peer') {
		formData.channelName = channelName;
	}
	const url = `${serverBaseUrl}/channel/createOrUpdateOrg`;
	logger.debug('createOrUpdateOrg', {url, formData});
	return exports.RequestPromise({url, formData});
};
