const assert = require('assert');
const fabprotos = require('fabric-protos');
const commonProto = fabprotos.common;
const {calculateTransactionId} = require('./helper');
const {BlockMetadataIndex: {SIGNATURES, TRANSACTIONS_FILTER, LAST_CONFIG, ORDERER, COMMIT_HASH}} = require('./constants');

class blockDecoder {
	constructor(block, logger = console) {
		Object.assign(this, {block, logger});
	}

	header() {
		const {header} = this.block;
		const {number, previous_hash, data_hash} = header;

		return {
			number: number.toInt(),
			previous_hash: previous_hash.toString('hex'),
			data_hash: data_hash.toString('hex')
		};
	}

	data() {
		const {data: {data: datas}} = this.block;
		for (const entry of datas) {
			const {channel_header, signature_header} = entry.payload.header;
			assert.strictEqual(calculateTransactionId(signature_header), channel_header.tx_id);

			const {config, actions} = entry.payload.data;
			if (config) {
				this.logger.info('a config transaction');
			} else if (actions) {
				this.logger.info(`${actions.length} chaincode invocation transactions`);

				for (const {payload, header} of actions) {

					const {chaincode_proposal_payload, action} = payload;
					const {proposal_response_payload, endorsements} = action;
					const {proposal_hash, extension} = proposal_response_payload;

					const {chaincode_spec} = chaincode_proposal_payload.input;
					const {chaincode_id: {name}} = chaincode_spec;
					if (name === '_lifecycle') {
						this.logger.info('a chaincode lifecycle transaction');

					} else {
						this.logger.info(`a application transaction on [${name}]`);
					}
				}

			} else {
				assert.fail('unknown transaction type found');
			}
		}
		return datas;
	}

	metadata() {
		const {metadata: {metadata}} = this.block;
		assert.strictEqual(metadata.length, 5);
		const {value, signatures} = metadata[SIGNATURES];

		for (const {signature_header, signature} of signatures) {
			this.logger.info({signature_header, signature});
		}
		metadata[SIGNATURES] = {value: {index: commonProto.LastConfig.decode(value).index.toInt()}, signatures};
		const [flag] = metadata[TRANSACTIONS_FILTER];
		const buf = metadata[COMMIT_HASH];

		const {value: _value, signatures: _signatures} = commonProto.Metadata.decode(buf);
		assert.ok(Array.isArray(_signatures) && _signatures.length === 0);
		metadata[COMMIT_HASH] = {commitHash: _value};

		assert.deepStrictEqual(metadata[LAST_CONFIG], {});
		assert.deepStrictEqual(metadata[ORDERER], {});
		assert.strictEqual(flag, 0);
		return metadata;
	}
}

module.exports = blockDecoder;