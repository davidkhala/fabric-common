package testdata

import (
	"context"
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/fabric-common/golang/discover"
	"github.com/hyperledger/fabric-protos-go-apiv2/discovery"
	"github.com/kortschak/utter"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestDiscover(t *testing.T) {

	var client = discover.Client{
		Context: context.Background(),
	}
	client.Init(Peer0Icdd.AsGRPCClient()) // return client
	var _crypto = golang.LoadCryptoFrom(CryptoconfigAstri)

	t.Run("configQuery", func(t *testing.T) {
		var query = discover.ConfigQuery(Channel)

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
		var query = discover.PeerMembershipQuery(Channel, nil)
		var responses = client.Request(_crypto, &query)

		for _, response := range responses {
			var result = response.(discover.Members)
			result.GetPeersByOrg(false)
		}
	})
	t.Run("LocalPeerQuery", func(t *testing.T) {
		var query = discover.LocalPeerQuery()
		var _crypto = golang.LoadCryptoFrom(CryptoconfigIcdd)
		var responses = client.Request(_crypto, &query)

		for _, response := range responses {
			var result = response.(discover.Members)
			for mspID, peers := range result.GetPeersByOrg(true) {
				for _, _peer := range peers {
					println(mspID, _peer.String())
				}
			}
		}
	})
	t.Run("ChaincodeQuery", func(t *testing.T) {
		var query = discover.ChaincodeQuery(Channel)
		var responses = client.Request(_crypto, &query)
		for _, response := range responses {
			utter.Dump(response)
		}
	})
}
