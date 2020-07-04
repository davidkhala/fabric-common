package org.hyperledger.fabric.fabricCommon;

import org.hyperledger.fabric.sdk.*;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.hyperledger.fabric.sdk.exception.TransactionException;

import java.lang.reflect.Field;

public class ChannelManager {
	public Channel channel;

	public ChannelManager(String name, HFClient client, Orderer orderer, ChannelConfiguration channelConfiguration, byte[]... channelConfigurationSignatures) throws InvalidArgumentException, TransactionException {
		if (orderer != null && channelConfiguration != null && channelConfigurationSignatures != null) {
			this.channel = client.newChannel(name, orderer, channelConfiguration, channelConfigurationSignatures);
		} else {
			this.channel = client.newChannel(name);
		}

	}

	public static HFClient getClient(Channel channel) throws NoSuchFieldException, IllegalAccessException {
		//        fixme: not getter for client in channel
		Field f = Channel.class.getDeclaredField("client"); //NoSuchFieldException
		f.setAccessible(true);
		return (HFClient) f.get(channel);
	}

	public void joinPeer(Peer peer) throws ProposalException {

		try {
			this.channel.joinPeer(peer);
		} catch (ProposalException e) {
			if (e.getMessage().contains("status: 500, message: Cannot create ledger from genesis block, due to LedgerID already exists")) {
//                swallow
				return;
			}
			throw e;
		}
	}

}
