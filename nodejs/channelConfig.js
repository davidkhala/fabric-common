import fabprotos from 'fabric-protos';
import assert from 'assert';
import {consoleLogger} from '@davidkhala/logger/log4.js';
import {ServerClient, configtxlator as Configtxlator} from './binManager/configtxlator.js';
import {getChannelConfigFromOrderer} from './channel.js';

import {ConfigtxlatorType} from 'khala-fabric-formatter/configtxlator.js';
import ConfigFactory from 'khala-fabric-formatter/configFactory.js';
import {BufferFrom} from 'khala-fabric-formatter/protobuf.js';
import ChannelUpdate from 'khala-fabric-admin/channelUpdate.js';
import SigningIdentityUtil from 'khala-fabric-admin/signingIdentity.js';
import {getNonce} from 'khala-fabric-formatter/helper.js';
import {CommonResponseStatus} from 'khala-fabric-formatter/constants.js';
import EventHub from 'khala-fabric-admin/eventHub.js';
import {emptyChannel} from 'khala-fabric-admin/channel.js';
import EventHubQuery from './eventHub.js';

const {SUCCESS} = CommonResponseStatus;
const configtxlatorClient = new ServerClient();
const commonProto = fabprotos.common;
const logger = consoleLogger('channel-config');

export class ChannelConfig {
	/**
	 * @param {string} channelName
	 * @param {Client.User} user
	 * @param {Orderer} orderer
	 * @param {string} [binPath]
	 */
	constructor(channelName, user, orderer, binPath = process.env.binPath) {
		Object.assign(this, {channelName, user, orderer, binPath});
	}

	/**
	 * @returns {Promise<{proto: protoMessage, json: string}>}
	 */
	async getChannelConfigReadable() {
		const {channelName, user, orderer} = this;
		const configEnvelope = await getChannelConfigFromOrderer(channelName, user, orderer);
		const protoBytes = BufferFrom(configEnvelope.config, commonProto.Config);

		let json;
		if (!this.binPath) {
			// This requires 'configtxlator' RESTful server running locally on port 7059
			const body = await configtxlatorClient.decode(ConfigtxlatorType.Config, protoBytes);
			json = JSON.stringify(body);
		} else {
			// Otherwise in default we will use 'configtxlator' command line tool residing in this.binPath
			const configtxlator = new Configtxlator(this.binPath);
			json = configtxlator.decode(ConfigtxlatorType.Config, protoBytes);
		}

		return {
			proto: protoBytes,
			json
		};
	}

	/**
	 *
	 * @param {[]} signingIdentities
	 * @param {string} orgName
	 * @param {[{host:string,port:number}]} anchorPeers
	 * @param {boolean} [finalityRequired]
	 * @return {Promise<void>}
	 */
	async setAnchorPeers(signingIdentities = [], orgName, anchorPeers, finalityRequired) {
		const {channelName, user, orderer} = this;
		if (signingIdentities.length === 0) {
			signingIdentities = [user._signingIdentity];
		}
		const channelUpdate = new ChannelUpdate(channelName, user, orderer.committer, logger);
		const {proto, json} = await this.getChannelConfigReadable();
		const configFactory = new ConfigFactory(json, logger);

		configFactory.setAnchorPeers(orgName, anchorPeers);
		const updateConfigJSON = configFactory.build();


		assert.ok(!!this.binPath, '[deprecated] configtxlatorServer is deprecated. env.binPath must be specified');
		const configtxlator = new Configtxlator(this.binPath);
		const updatedProto = configtxlator.encode(ConfigtxlatorType.Config, updateConfigJSON);
		let config;
		try {
			config = configtxlator.computeUpdate(channelName, proto, updatedProto);
		} catch (e) {
			const expected = 'configtxlator: error: Error computing update: error computing config update: no differences detected between original and updated config';
			if (e.stderr.trim() === expected) {
				logger.warn('[skip]no differences detected between original and updated config');
				return;
			} else {
				throw e;
			}
		}


		const signatures = signingIdentities.map(signingIdentity => {
			const extraSigningIdentityUtil = new SigningIdentityUtil(signingIdentity);
			return extraSigningIdentityUtil.signChannelConfig(config, getNonce());
		});

		channelUpdate.useSignatures(config, signatures);
		channelUpdate.identityContext.calculateTransactionId();
		let channel, eventHub, eventHubQuery, beforeHeight;
		if (finalityRequired) {
			channel = emptyChannel(channelName);
			eventHub = new EventHub(channel, orderer.eventer);
			eventHubQuery = new EventHubQuery(eventHub, channelUpdate.identityContext, logger);

			const block = await eventHubQuery.getLastBlock();
			beforeHeight = parseInt(block.header.number);
			await eventHub.disconnect();
		}
		const {status, info} = await channelUpdate.submit(channelUpdate.identityContext);
		assert.strictEqual(info, '');
		assert.strictEqual(status, SUCCESS);
		// wait for finality
		if (finalityRequired) {

			await eventHubQuery.waitUntilBlock(beforeHeight + 1);

			await eventHub.disconnect();
			const {json: updatedJson} = await this.getChannelConfigReadable();
			const updatedAnchorPeers = new ConfigFactory(updatedJson).getAnchorPeers(orgName);

			assert.deepStrictEqual(updatedAnchorPeers.value.anchor_peers, anchorPeers);
		}

	}
}
