package golang

import (
	"context"
	"github.com/davidkhala/fabric-common/golang/discover"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/discovery"
	"github.com/kortschak/utter"
	"github.com/stretchr/testify/assert"
	"testing"
)

var peer0_icdd = Node{
	Addr:      "localhost:8051",
	TLSCARoot: goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem"),

	SslTargetNameOverride: "peer0.icdd",
}
var cryptoConfig_astri = CryptoConfig{
	MSPID:    "astriMSP",
	PrivKey:  FindKeyFilesOrPanic(goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore"))[0],
	SignCert: goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/signcerts/Admin@astri.org-cert.pem"),
}
var cryptoConfig_icdd = CryptoConfig{
	MSPID:    "icddMSP",
	PrivKey:  FindKeyFilesOrPanic(goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/users/Admin@icdd/msp/keystore"))[0],
	SignCert: goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/users/Admin@icdd/msp/signcerts/Admin@icdd-cert.pem"),
}

func TestConnection(t *testing.T) {
	peer0_icdd.AsGRPCClient()
}
func TestNodeJsonFormat(t *testing.T) {
	println(string(goutils.ToJson(peer0_icdd)))
}
func TestDiscover(t *testing.T) {

	var client = discover.Client{
		Context: context.Background(),
	}
	client.Init(peer0_icdd.AsGRPCClient()) // return client
	crypto, err := LoadCryptoFrom(cryptoConfig_astri)
	goutils.PanicError(err)

	var channel = "allchannel"

	t.Run("configQuery", func(t *testing.T) {
		var query = discover.ConfigQuery(channel)

		var responses = client.Request(crypto, &query)

		for _, response := range responses {
			var result = response.(discover.ConfigResult)
			utter.Dump(result.GetMSPs())
		}
	})
	t.Run("configQuery: empty channel", func(t *testing.T) {
		var query = discovery.Query{
			Query: &discovery.Query_ConfigQuery{
				ConfigQuery: &discovery.ConfigQuery{},
			},
		}
		var responses = client.Request(crypto, &query)
		var response = responses[0]

		assert.Equal(t, "access denied", response.(discover.Error).Content)

		assert.Panics(t, func() {
			var _ = response.(discover.ConfigResult)
		})

	})
	t.Run("PeerMembershipQuery", func(t *testing.T) {
		var query = discover.PeerMembershipQuery(channel, nil)
		var responses = client.Request(crypto, &query)

		for _, response := range responses {
			var result = response.(discover.Members)
			result.GetPeersByOrg(false)
		}
	})
	t.Run("LocalPeerQuery", func(t *testing.T) {
		var query = discover.LocalPeerQuery()
		crypto, err := LoadCryptoFrom(cryptoConfig_icdd)
		goutils.PanicError(err)
		var responses = client.Request(crypto, &query)

		for _, response := range responses {
			var result = response.(discover.Members)
			result.GetPeersByOrg(true)
		}
	})
	t.Run("ChaincodeQuery", func(t *testing.T) {
		var query = discover.ChaincodeQuery(channel)
		var responses = client.Request(crypto, &query)
		for _, response := range responses {
			utter.Dump(response)
		}
	})

}
func TestFindKeyFilesOrPanic(t *testing.T) {
	var dirname = goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore/")
	utter.Dump(FindKeyFilesOrPanic(dirname))
}
