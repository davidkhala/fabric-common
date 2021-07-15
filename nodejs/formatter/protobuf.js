/**
 * Copyright 2018,2021 IBM, Oracle All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const grpc = require('grpc');
const protobuf = require('protobufjs');
/**
 * Load service descriptors and client stub definitions from a .proto file.
 * @param {string} filename The filename of the .proto file.
 * @param {Object} [options]  The options used to load the .proto file.
 * @returns {*} The loaded service descriptors and client stub definitions.
 */
const load = (filename) => {
	const builder = protobuf.loadProtoFile(filename);
	return grpc.loadObject(builder, {protobufjsVersion: 5});
};

module.exports = load;
