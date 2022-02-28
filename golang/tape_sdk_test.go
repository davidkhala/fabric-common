package golang

import (
	"github.com/davidkhala/goutils"
	"github.com/hyperledger-twgc/tape/pkg/infra"
	log "github.com/sirupsen/logrus"
	"testing"
)

var logger = log.New()

func TestPingPeer0_icdd(t *testing.T) {

	// peer0.icdd
	var node = infra.Node{
		Addr:      "localhost:8051", // TLSCACert should have a SAN extension
		TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/peers/peer0.icdd/tls/ca.crt",
	}

	_, err := infra.DailConnection(node, logger)
	goutils.PanicError(err)

}
func TestProposer(t *testing.T) {

}
