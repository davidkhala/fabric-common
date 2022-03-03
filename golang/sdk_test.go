package golang

import (
	"github.com/davidkhala/goutils"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	"testing"
)

func TestConnection(t *testing.T) {
	var peer0_icdd = Node{
		Node: tape.Node{
			Addr:      "localhost:8051",
			TLSCACert: "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem",
		},
	}
	var err error
	_, err = peer0_icdd.AsGRPCClient()

	goutils.PanicError(err)

}
