package model;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.hyperledger.fabric.sdk.*;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

public class Chaincode {


    public static class ProposalResultWrapper {
        Collection<ProposalResponse> proposalResponses;

        Collection<ProposalResponse> successResponses;
        Collection<ProposalResponse> failureResponses;

        public CompletableFuture<BlockEvent.TransactionEvent> future;

        public ProposalResultWrapper(Collection<ProposalResponse> proposalResponses) {

            this.proposalResponses = proposalResponses;
            successResponses = new ArrayList<>();
            failureResponses = new ArrayList<>();

            for (ProposalResponse response : proposalResponses) {
                if (response.getStatus() == ProposalResponse.Status.SUCCESS) {
                    successResponses.add(response);
                } else {
                    failureResponses.add(response);
                }
            }
        }

        public boolean hasError() {
            return failureResponses.size() > 0;
        }

    }

    public static ChaincodeID ccMetaDataBuilder(String ccName, String ccVersion, String ccPath) {
        return ChaincodeID.newBuilder().setName(ccName).setVersion(ccVersion).setPath(ccPath).build();
    }

    public static ProposalResultWrapper install(HFClient client, Set<Peer> peers, ChaincodeID chaincodeMetaData, String GOPATH) throws InvalidArgumentException, ProposalException {
        InstallProposalRequest installProposalRequest = client.newInstallProposalRequest();

        installProposalRequest.setChaincodeSourceLocation(new File(GOPATH));
        installProposalRequest.setChaincodeID(chaincodeMetaData);

        Collection<ProposalResponse> proposalResponses = client.sendInstallProposal(installProposalRequest, peers);

        return new ProposalResultWrapper(proposalResponses);

    }

    public static ProposalResultWrapper instantiate(Channel channel, Set<Peer> peers, ChaincodeID chaincodeMetaData, String[] args) throws ProposalException, InvalidArgumentException, NoSuchFieldException, IllegalAccessException {
        HFClient client = ChannelUtil.getClient(channel);
        InstantiateProposalRequest instantiateProposalRequest = client.newInstantiationProposalRequest();
        instantiateProposalRequest.setChaincodeID(chaincodeMetaData);
        instantiateProposalRequest.setFcn("init");
        instantiateProposalRequest.setArgs(args);
        instantiateProposalRequest.setTransientMap(new HashMap<>());// FIXME: Transient map may not be null
        Collection<ProposalResponse> responses = channel.sendInstantiationProposal(instantiateProposalRequest, peers);

        return new ProposalResultWrapper(responses);
    }

    public static ProposalResultWrapper invoke(Channel channel, Set<Peer> peers, ChaincodeID chaincodeMetaData, String[] args) throws InvalidArgumentException, NoSuchFieldException, IllegalAccessException, ProposalException {
        HFClient client = ChannelUtil.getClient(channel);
        TransactionProposalRequest txProposal = client.newTransactionProposalRequest();
        txProposal.setChaincodeID(chaincodeMetaData);
        txProposal.setFcn("invoke");
        txProposal.setArgs(args);
        txProposal.setTransientMap(new HashMap<>());
        return new ProposalResultWrapper(channel.sendTransactionProposal(txProposal, peers));
    }

}