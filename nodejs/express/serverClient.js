const logger = require('../logger').new('ServerClient');
const {sha2_256} = require('fabric-client/lib/hash');
const fs = require('fs');
const path = require('../../nodejs/path');
const fsExtra = require('fs-extra');
const requestBuilder = ({uri, body}) => {
	return {
		method: 'POST',
		uri,
		body,
		json: true
	};
};
const errHandler = (resolve, reject) => (err, resp, body) => {
	if (err) reject(err);
	resolve(body);
};
const Request = require('request');
//TODO have not cover all API yet
exports.ping = (serverBaseUrl) => {
	return new Promise((resolve, reject) => {
		Request.get(`${serverBaseUrl}/`, errHandler(resolve, reject));
	});
};
exports.manager = {
	join: (serverBaseUrl, {ip, hostname}) => {
		logger.info('managerJoin', {serverBaseUrl, ip, hostname});
		return new Promise((resolve, reject) => {
			Request(requestBuilder({
				uri: `${serverBaseUrl}/manager/join`,
				body: {ip, hostname}
			}), errHandler(resolve, reject));
		});
	},
	leave: (serverBaseUrl, {ip}) => {
		logger.info('managerLeave', {serverBaseUrl, ip});
		return new Promise((resolve, reject) => {
			Request(requestBuilder({
				uri: `${serverBaseUrl}/manager/leave`,
				body: {ip}
			}), errHandler(resolve, reject));
		});
	},
	info: (serverBaseUrl) => {
		return new Promise((resolve, reject) => {
			Request.get(`${serverBaseUrl}/manager`, errHandler(resolve, reject));
		});
	},
};
exports.leader = {
	update: (serverBaseUrl, {ip, hostname, managerToken}) => {
		return new Promise((resolve, reject) => {
			Request(requestBuilder({
				uri: `${serverBaseUrl}/leader/update`,
				body: {ip, hostname, managerToken}
			}), errHandler(resolve, reject));
		});
	},
	info: (serverBaseUrl) => {
		return new Promise((resolve, reject) => {
			Request.get(`${serverBaseUrl}/leader`, errHandler(resolve, reject));
		});
	},
};
/**
 * Take care fs.write encoding specifically
 * @param serverBaseUrl
 * @param filePath
 * @returns {Promise<any>}
 */
exports.block = (serverBaseUrl, filePath) => {
	return new Promise((resolve, reject) => {
		Request.get(`${serverBaseUrl}/block`, (err, resp, body) => {
			if (err) reject(err);
			logger.debug('check hash ', sha2_256(body));
			fsExtra.ensureDirSync(path.dirname(filePath));
			fs.writeFileSync(path.resolve(filePath), body, 'binary');
			resolve(filePath);
		});
	});
};
exports.getSignatures = (serverBaseUrl, protoPath) => {
	return new Promise((resolve, reject) => {
		const formData = {
			proto: fs.createReadStream(protoPath)
		};
		//TODO signServerPort might be different
		Request.post({url: `${serverBaseUrl}/`, formData}, errHandler(resolve, reject));
	});
};

exports.newOrg = (serverBaseUrl, channelName, MSPID, MSPName, nodeType, {admins, root_certs, tls_root_certs}) => {

	const formData = {
		channelName, MSPID, MSPName, nodeType,
		admins: admins.map(path => fs.createReadStream(path)),
		root_certs: root_certs.map(path => fs.createReadStream(path)),
		tls_root_certs: tls_root_certs.map(path => fs.createReadStream(path)),
	};
	return new Promise((resolve, reject) => {
		Request.post({url: `${serverBaseUrl}/channel/newOrg`, formData}, errHandler(resolve, reject));
	});
};

