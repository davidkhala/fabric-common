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
var peer0_icdd = golang.Node{
	Node: tape.Node{
		Addr:      "localhost:8051",
		TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem",
	},
	SslTargetNameOverride: "peer0.icdd",
}

// peer0.astri.org
var peer0_astri = golang.Node{
	Node: tape.Node{
		Addr:      "localhost:7051",
		TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer0.astri.org/tls/ca.crt",
	},
	SslTargetNameOverride: "peer0.astri.org",
}

// orderer0.hyperledger
var orderer0 = golang.Node{
	Node: tape.Node{
		Addr:      "localhost:7050",
		TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/ordererOrganizations/hyperledger/orderers/orderer0.hyperledger/tls/ca.crt",
	},
	SslTargetNameOverride: "orderer0.hyperledger",
}

var config = tape.Config{
	Endorsers:       []tape.Node{peer0_icdd.Node},
	Committers:      nil,
	CommitThreshold: 0,
	Orderer:         orderer0.Node,
	Channel:         "allchannel",
	Chaincode:       "diagnose",
	Version:         "",
	Args:            []string{"whoami"},
	MSPID:           "astriMSP",
	PrivateKey:      "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore/5c2c5db454e25750fc84853900e5913cb4df49bcffff8a881146d08ca409c3af_sk",
	// TODO why not support ~
	SignCert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/signcerts/Admin@astri.org-cert.pem",
	// TODO why not support ~
	NumOfConn:     1,
	ClientPerConn: 1,
}

func TestPing(t *testing.T) {
	_, err := tape.DailConnection(peer0_icdd.Node, logger)
	goutils.PanicError(err)
	_, err = tape.DailConnection(peer0_astri.Node, logger)
	goutils.PanicError(err)
	_, err = tape.DailConnection(orderer0.Node, logger)
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
	var txResult *orderer.BroadcastResponse
	var peer0, ordererGrpc *grpc.ClientConn
	var ctx = context.Background()
	defer func() {
		err = peer0.Close()
		err = ordererGrpc.Close()
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

	peer0, err = peer0_icdd.AsGRPCClient()

	endorser = golang.EndorserFrom(peer0)
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
	ordererGrpc, err = orderer0.AsGRPCClient()
	goutils.PanicError(err)
	var committer = golang.Committer{
		AtomicBroadcastClient: golang.CommitterFrom(ordererGrpc),
	}
	err = committer.Setup()
	goutils.PanicError(err)

	//
	txResult, err = committer.SendRecv(transaction)
	goutils.PanicError(err)
	utter.Dump(txResult)
}
