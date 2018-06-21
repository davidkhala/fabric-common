const express = require('express');
const logger = require('../logger').new('express server');
exports.run = (port, host) => {
	const bodyParser = require('body-parser');
	const http = require('http');
	const app = express();
	const cors = require('cors');

	app.options('*', cors());
	app.use(cors());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended: false
	}));
	const server = http.createServer(app).listen(port, host, () => {
		logger.info('server started at', {host, port});
	});

	server.timeout = 240000;
	return {app, server};
};
exports.getRouter = () => {
	return express.Router();
};