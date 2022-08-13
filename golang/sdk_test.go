package golang

import (
	"github.com/davidkhala/goutils"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	"github.com/kortschak/utter"
	"testing"
)

var peer0_icdd = Node{
	Node: tape.Node{
		Addr:      "localhost:8051",
		TLSCARoot: "/home/davidliu/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem",
	},
	SslTargetNameOverride: "peer0.icdd",
}

func TestConnection(t *testing.T) {

	var err error
	_, err = peer0_icdd.AsGRPCClient()

	goutils.PanicError(err)

}
func TestNodeJsonFormat(t *testing.T) {
	println(string(goutils.ToJson(peer0_icdd)))
}
func TestFindKeyFilesOrPanic(t *testing.T) {
	var dirname = "/home/davidliu/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore/"
	utter.Dump(FindKeyFilesOrPanic(dirname))
}
