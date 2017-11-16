package model;

import org.hyperledger.fabric.sdk.*;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.hyperledger.fabric.sdk.exception.TransactionException;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;

public class ChannelUtil {

    public static HFClient getClient(Channel channel) throws NoSuchFieldException, IllegalAccessException {
        //        fixme: not getter for client in channel
        Field f = Channel.class.getDeclaredField("client"); //NoSuchFieldException
        f.setAccessible(true);
        return (HFClient) f.get(channel);
    }
    public static void joinPeer(Channel channel, Peer peer) throws ProposalException, InvalidArgumentException {

        try {
            channel.joinPeer(peer);
        } catch (ProposalException e) {
            if (e.getMessage().contains("status: 500, message: Cannot create ledger from genesis block, due to LedgerID already exists")) {
//                swallow
                channel.addPeer(peer);
                return;
            }
            throw e;
        }
    }

    /**
     * @param client
     * @param channelName
     * @param ordererGRPCURL grpc://localhost:7250
     * @param channelFile
     * @return
     * @throws InvalidArgumentException
     * @throws IOException
     * @throws TransactionException
     */
    public static Channel createOrGetChannel(HFClient client, String channelName, String ordererGRPCURL, File channelFile) throws InvalidArgumentException, IOException, TransactionException {
        Channel channel;
        Orderer orderer = client.newOrderer("fine", ordererGRPCURL);
        try {
            channel = client.newChannel(channelName).addOrderer(orderer);
            channel = channel.initialize();
        } catch (TransactionException e) {
            e.printStackTrace();
            ChannelConfiguration channelConfiguration = new ChannelConfiguration(channelFile);
            client.newChannel(channelName, orderer, channelConfiguration, client.getChannelConfigurationSignature(channelConfiguration, client.getUserContext()));
            channel = getChannelLoop(client, channelName, orderer);
        }
        return channel;
    }

    static Channel getChannelLoop(HFClient client, String channelName, Orderer orderer) throws InvalidArgumentException, IOException, TransactionException {
        Channel channel;
        try {
            channel = client.newChannel(channelName).addOrderer(orderer);
            channel = channel.initialize();
        } catch (TransactionException e) {
            channel = getChannelLoop(client, channelName, orderer);
        }
        return channel;
    }
}
