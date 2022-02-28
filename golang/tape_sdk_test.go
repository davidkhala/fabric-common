package golang

import (
	"github.com/davidkhala/goutils"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	log "github.com/sirupsen/logrus"
	"testing"
)

var logger = log.New()

// peer0.icdd
var peer0_icdd = tape.Node{
	Addr:      "localhost:8051", // TLSCACert should have a SAN extension
	TLSCACert: "~/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/peers/peer0.icdd/tls/ca.crt",
}

// peer0.astri.org
var peer0_astri = tape.Node{
	Addr:      "localhost:7051",
	TLSCACert: "~/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer0.astri.org/tls/ca.crt",
}
var config = tape.Config{
	Endorsers:       []tape.Node{peer0_icdd},
	Committers:      nil,
	CommitThreshold: 0,
	Orderer:         tape.Node{},
	Channel:         "allchannel",
	Chaincode:       "diagnose",
	Version:         "",
	Args:            []string{"whoami"},
	MSPID:           "icddMSP",
	PrivateKey:      "",
	SignCert:        "",
	NumOfConn:       1,
	ClientPerConn:   1,
}

func TestPingPeer0_icdd(t *testing.T) {
	_, err := tape.DailConnection(peer0_icdd, logger)
	goutils.PanicError(err)
	_, err = tape.DailConnection(peer0_astri, logger)
	goutils.PanicError(err)
}
func TestCreateProposal(t *testing.T) {

	var creator = tape.Crypto{
		Creator: nil,
	}
	_, err := tape.CreateProposal(
		&creator,
		config.Channel,
		config.Chaincode,
		config.Version,
		config.Args...,
	)
	goutils.PanicError(err)

}
