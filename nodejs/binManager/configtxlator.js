import fs from 'fs';
import FormData from 'form-data';
import {execStream, execSync, killProcess} from '@davidkhala/light/devOps.js';
import {createTmpFile} from '@davidkhala/nodeutils/tmp.js';
import {findProcess} from '@davidkhala/nodeutils/devOps.js';
import {axiosPromise} from '@davidkhala/axios/index.js';
import BinManager from './binManager.js';

// TODO how to use streaming buffer to exec
export class configtxlator extends BinManager {
	/**
	 * Converts a JSON document to protobuf.
	 * @param {ConfigtxlatorType} type The type of protobuf structure to encode to.
	 * @param {string} inputFile A file containing the JSON document.
	 * @param {string} outputFile A file to write the output to.
	 */
	encodeFile(type, {inputFile, outputFile}) {
		const CMD = this._buildCMD(`proto_encode --type=${type} --input=${inputFile} --output=${outputFile}`);
		execSync(CMD);
	}

	/**
	 *
	 * @param {ConfigtxlatorType} type
	 * @param {string} json
	 * @return {Buffer}
	 */
	encode(type, json) {

		const [tmpJSONFile, t1] = createTmpFile({postfix: '.json'});
		const [tmpFile, t2] = createTmpFile();
		fs.writeFileSync(tmpJSONFile, json);
		this.encodeFile(type, {inputFile: tmpJSONFile, outputFile: tmpFile});
		const returned = fs.readFileSync(tmpFile);
		t1();
		t2();
		return returned;
	}

	/**
	 * Converts a proto message to JSON.
	 * @param {ConfigtxlatorType} type The type of protobuf structure to decode from.
	 * @param {string} inputFile A file containing the proto message.
	 * @param {string} outputFile A file to write the JSON document to.
	 * @return {json} original_config
	 */
	decodeFile(type, {inputFile, outputFile}) {
		const CMD = this._buildCMD(`proto_decode --type=${type} --input=${inputFile} ${outputFile ? `--output=${outputFile}` : ''}`);
		execSync(CMD);
	}

	/**
	 *
	 * @param {ConfigtxlatorType} type
	 * @param original_config_proto
	 * @return {json|string} original_config
	 */
	decode(type, original_config_proto) {
		const [tmpFile, t1] = createTmpFile();
		const [tmpJSONFile, t2] = createTmpFile({postfix: '.json'});
		fs.writeFileSync(tmpFile, original_config_proto);

		this.decodeFile(type, {inputFile: tmpFile, outputFile: tmpJSONFile});

		const returned = fs.readFileSync(tmpJSONFile, 'utf-8');

		t1();
		t2();
		return returned;
	}

	/**
	 * Takes two marshaled common.Config messages and computes the config update which transitions between the two.
	 * @param {string} channelID The name of the channel for this update.
	 * @param {string} original The original config message.(file path)
	 * @param {string} updated The updated config message.(file path)
	 * @param {string} outputFile A file to write the config update message to. //TODO fabric document "A file to write the JSON document to."
	 */
	computeUpdateFile(channelID, original, updated, outputFile) {
		const CMD = this._buildCMD(`compute_update --channel_id=${channelID} --original=${original} --updated=${updated}  --output=${outputFile}`);
		execSync(CMD);
	}

	/**
	 *
	 * @param {string} channelID
	 * @param {Buffer} original_config_proto The original config message
	 * @param {Buffer} updated_config_proto The updated config message
	 * @return {Buffer} modified_config_proto
	 */
	computeUpdate(channelID, original_config_proto, updated_config_proto) {
		const [tmpFileOriginal, t1] = createTmpFile();
		const [tmpFileUpdated, t2] = createTmpFile();
		const [tmpFileOutput, t3] = createTmpFile();
		fs.writeFileSync(tmpFileOriginal, original_config_proto);
		fs.writeFileSync(tmpFileUpdated, updated_config_proto);
		this.computeUpdateFile(channelID, tmpFileOriginal, tmpFileUpdated, tmpFileOutput);
		const returned = fs.readFileSync(tmpFileOutput);
		t1();
		t2();
		t3();
		return returned;
	}


	get executable() {
		return 'configtxlator';
	}
}

export class Server extends BinManager {

	get executable() {
		return 'configtxlator';
	}

	/**
	 * @param {string} [hostname] The hostname or IP on which the REST server will listen
	 * @param {number} [port] The port on which the REST server will listen
	 * @param {string[]} [CORS] Allowable CORS domains, e.g. ['*'] or ['www.example.com']
	 */
	start({hostname = '0.0.0.0', port = 7059, CORS = ['*']} = {}) {
		const CORSReducer = (opt, entry) => {
			return opt + `--CORS=${entry}`;
		};
		const CMD = this._buildCMD(`start --hostname=${hostname} --port=${port} ${CORS.reduce(CORSReducer, '')}`);
		this.logger.info('CMD', CMD);
		execStream(CMD);
	}

	async stop(port = 7059) {
		const matched = await findProcess({port});
		const process = matched[0];
		if (process) {
			this.logger.info(`kill ${process}`);
			killProcess(process);
		}
	}
}

export class ServerClient {
	constructor({protocol, host, port} = {}) {
		if (!protocol) {
			protocol = 'http';
		}
		if (!host) {
			host = 'localhost';
		}
		if (!port) {
			port = 7059;
		}
		this.baseUrl = `${protocol}://${host}:${port}`;
	}

	static async requestPost(opt, otherOptions) {
		opt.method = 'POST';
		return await axiosPromise(opt, otherOptions);
		//	TODO list out common error case

	}

	/**
	 * @param {ConfigtxlatorType} type
	 * @param jsonString
	 */
	async encode(type, jsonString) {
		const baseUrl = `${this.baseUrl}/protolator/encode`;
		const body = jsonString;
		return ServerClient.requestPost({
			url: `${baseUrl}/${type}`, body
		}, {
			responseType: 'arraybuffer'
		});
	}

	/**
	 *
	 * @param {ConfigtxlatorType} type
	 * @param {Buffer} data
	 */
	async decode(type, data) {
		const body = data;
		return await ServerClient.requestPost({url: `${this.baseUrl}/protolator/decode/${type}`, body});
	}

	async computeUpdate(channelName, originalConfigProtoBuff, updatedConfigProtoBuff) {
		const formData = new FormData();
		formData.append('channel', channelName);
		formData.append('updated', updatedConfigProtoBuff, {
			filename: 'updated.proto', contentType: 'application/octet-stream'
		});


		formData.append('original', originalConfigProtoBuff, {
			filename: 'original.proto', contentType: 'application/octet-stream'
		});


		return await ServerClient.requestPost({
			url: `${this.baseUrl}/configtxlator/compute/update-from-configs`, formData
		}, {responseType: 'arraybuffer'});

	}
}