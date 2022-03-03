package tape

import (
	"context"
	"fmt"
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/goutils"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	"github.com/hyperledger/fabric-protos-go/common"
	"github.com/hyperledger/fabric-protos-go/orderer"
	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/kortschak/utter"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"testing"
)

var logger = logrus.New()

// peer0.icdd
var peer0_icdd = tape.Node{
	Addr:      "localhost:8051", // TLSCACert should have a SAN extension
	TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem",
}

// peer0.astri.org
var peer0_astri = tape.Node{
	Addr:      "localhost:7051",
	TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer0.astri.org/tls/ca.crt",
}

// orderer0.hyperledger
var orderer0 = tape.Node{
	Addr:      "localhost:7050",
	TLSCACert: "~/Documents/delphi-fabric/config/ca-crypto-config/ordererOrganizations/hyperledger/orderers/orderer0.hyperledger/tls/ca.crt",
}

var config = tape.Config{
	Endorsers:       []tape.Node{peer0_icdd},
	Committers:      nil,
	CommitThreshold: 0,
	Orderer:         orderer0,
	Channel:         "allchannel",
	Chaincode:       "diagnose",
	Version:         "",
	Args:            []string{"whoami"},
	MSPID:           "astriMSP",
	PrivateKey:      "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer0.astri.org/msp/keystore/46f564fc6c960ef298c3ac73ad276480d496ac9662f0ba913177ca61bea42d17_sk",
	// TODO why not support ~
	SignCert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/signcerts/Admin@astri.org-cert.pem",
	// TODO why not support ~
	NumOfConn:     1,
	ClientPerConn: 1,
}

func TestPing(t *testing.T) {
	_, err := tape.DailConnection(peer0_icdd, logger)
	goutils.PanicError(err)
	_, err = tape.DailConnection(peer0_astri, logger)
	goutils.PanicError(err)
	_, err = tape.DailConnection(orderer0, logger)
	goutils.PanicError(err)
}
func TestCreateProposal(t *testing.T) {
	var signer *tape.Crypto
	var err error
	var proposal *peer.Proposal
	var signed *peer.SignedProposal
	var endorser peer.EndorserClient
	var proposalResponse *peer.ProposalResponse
	var proposalResponses []*peer.ProposalResponse
	var transaction *common.Envelope
	var broadcaster orderer.AtomicBroadcast_BroadcastClient
	var txResult *orderer.BroadcastResponse
	var connect *grpc.ClientConn
	var ctx = context.Background()
	defer func() {
		err = connect.Close()
	}()
	signer, err = config.LoadCrypto()
	goutils.PanicError(err)
	proposal, err = tape.CreateProposal(
		signer,
		config.Channel,
		config.Chaincode,
		config.Version,
		config.Args...,
	)
	goutils.PanicError(err)
	//
	signed, err = tape.SignProposal(proposal, signer)
	goutils.PanicError(err)
	// peer0.icdd
	var peer0_icdd_p = golang.Node{
		Node:                  peer0_icdd,
		SslTargetNameOverride: "peer0.icdd",
	}

	connect, err = peer0_icdd_p.AsGRPCClient()

	endorser = golang.EndorserFrom(connect)
	goutils.PanicError(err)
	proposalResponse, err = endorser.ProcessProposal(ctx, signed)
	goutils.PanicError(err)

	if proposalResponse.Response.Status < 200 || proposalResponse.Response.Status >= 400 {
		err = fmt.Errorf("Err processing proposal: %s, status: %d, message: %s,\n", err, proposalResponse.Response.Status, proposalResponse.Response.Message)
		goutils.PanicError(err)
	}

	utter.Dump(string(proposalResponse.Response.Payload))

	proposalResponses = []*peer.ProposalResponse{proposalResponse}
	transaction, err = tape.CreateSignedTx(proposal, signer, proposalResponses)
	goutils.PanicError(err)
	broadcaster, err = tape.CreateBroadcastClient(ctx, orderer0, logger)
	goutils.PanicError(err)
	err = broadcaster.Send(transaction)
	goutils.PanicError(err)

	// FIXME not ready to use
	txResult, err = broadcaster.Recv()
	goutils.PanicError(err)
	utter.Dump(txResult)
}
