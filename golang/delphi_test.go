package golang

import (
	"context"
	"github.com/davidkhala/fabric-common/golang/discover"
	"github.com/davidkhala/fabric-common/golang/event"
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
var channel = "allchannel"

func TestConnection(t *testing.T) {
	peer0_icdd.AsGRPCClient()
	println(string(goutils.ToJson(peer0_icdd)))
}
func TestEvent(t *testing.T) {

	var eventer = event.NewEventer(context.Background(), peer0_icdd.AsGRPCClient())
	var blockEventer = event.NewBlockEventer(eventer, func(this event.DeliverResponseType, deliverResponses []event.DeliverResponseType) (bool, interface{}) {
		println(this.Block.Header.Number)

		return true, nil
	})
	var seek = event.SeekInfoFrom(event.SeekOldest, event.SeekNewest)
	var _crypto = LoadCryptoFrom(cryptoConfig_astri)

	blockEventer.SendRecv(seek.SignBy(channel, _crypto))
}

func TestDiscover(t *testing.T) {

	var client = discover.Client{
		Context: context.Background(),
	}
	client.Init(peer0_icdd.AsGRPCClient()) // return client
	var _crypto = LoadCryptoFrom(cryptoConfig_astri)

	t.Run("configQuery", func(t *testing.T) {
		var query = discover.ConfigQuery(channel)

		var responses = client.Request(_crypto, &query)

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
		var responses = client.Request(_crypto, &query)
		var response = responses[0]

		assert.Equal(t, "access denied", response.(discover.Error).Content)

		assert.Panics(t, func() {
			var _ = response.(discover.ConfigResult)
		})

	})
	t.Run("PeerMembershipQuery", func(t *testing.T) {
		var query = discover.PeerMembershipQuery(channel, nil)
		var responses = client.Request(_crypto, &query)

		for _, response := range responses {
			var result = response.(discover.Members)
			result.GetPeersByOrg(false)
		}
	})
	t.Run("LocalPeerQuery", func(t *testing.T) {
		var query = discover.LocalPeerQuery()
		var _crypto = LoadCryptoFrom(cryptoConfig_icdd)
		var responses = client.Request(_crypto, &query)

		for _, response := range responses {
			var result = response.(discover.Members)
			result.GetPeersByOrg(true)
		}
	})
	t.Run("ChaincodeQuery", func(t *testing.T) {
		var query = discover.ChaincodeQuery(channel)
		var responses = client.Request(_crypto, &query)
		for _, response := range responses {
			utter.Dump(response)
		}
	})

}
func TestFindKeyFilesOrPanic(t *testing.T) {
	var dirname = goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore/")
	utter.Dump(FindKeyFilesOrPanic(dirname))
}
