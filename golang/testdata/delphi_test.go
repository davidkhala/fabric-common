package testdata

import (
	"context"
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/fabric-common/golang/discover"
	"github.com/davidkhala/fabric-common/golang/event"
	"github.com/davidkhala/fabric-common/golang/proto"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/discovery"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/kortschak/utter"
	"github.com/stretchr/testify/assert"
	"slices"
	"testing"
)

func TestCryptoMaterial(t *testing.T) {
	golang.LoadCryptoFrom(CryptoconfigAstri)
	golang.LoadCryptoFrom(CryptoconfigIcdd)
}
func TestConnection(t *testing.T) {
	Peer0Icdd.AsGRPCClient()
	println(string(goutils.ToJson(Peer0Icdd)))
}
func TestEvent(t *testing.T) {

	var eventer = event.NewEventer(context.Background(), Peer0Icdd.AsGRPCClient())
	t.Run("replay", func(t *testing.T) { // TODO WIP
		var blockEventer = event.NewBlockEventer(eventer, func(this event.DeliverResponseType, deliverResponses []event.DeliverResponseType) (bool, interface{}) {

			var trimmedBlock = proto.FromFullBlock(this.Block)

			for index, tx := range trimmedBlock.TrimmedTransactions {
				println(trimmedBlock.Number, index, tx.Type.String())
			}

			return true, nil
		})
		var seek = event.SeekInfoFrom(event.SeekOldest, event.SeekNewest)
		var _crypto = golang.LoadCryptoFrom(CryptoconfigAstri)

		blockEventer.SendRecv(seek.SignBy(Channel, _crypto))
	})
	t.Run("waitForTx", func(t *testing.T) {
		var blockEventer = event.NewSimpleBlockEventer(eventer)
		var txEvent = event.TransactionListener{
			BlockEventer: blockEventer,
		}
		txEvent.WaitForTx("6cc51d00c5a65b037c467aa3b06db312653544155afcf2d70bc8212fe3c6df7e") // replace with known one
		var seek = txEvent.GetSeekInfo()
		var _crypto = golang.LoadCryptoFrom(CryptoconfigAstri)
		result, _ := txEvent.SendRecv(seek.SignBy(Channel, _crypto))
		assert.Equal(t, peer.TxValidationCode_VALID.String(), result)
	})
	t.Run("waitForTx: From full block", func(t *testing.T) {
		var blockEventer = event.NewBlockEventer(eventer)
		var txEvent = event.TransactionListener{
			BlockEventer: blockEventer,
		}
		txEvent.WaitForTx("6cc51d00c5a65b037c467aa3b06db312653544155afcf2d70bc8212fe3c6df7e") // replace with known one
		var seek = txEvent.GetSeekInfo()
		var _crypto = golang.LoadCryptoFrom(CryptoconfigAstri)
		result, _ := txEvent.SendRecv(seek.SignBy(Channel, _crypto))
		assert.Equal(t, peer.TxValidationCode_VALID.String(), result)
	})

}

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
func TestQuery(t *testing.T) {
	var _crypto = golang.LoadCryptoFrom(CryptoconfigIcdd)
	var ctx = context.Background()
	t.Run("ListChannelOnPeer", func(t *testing.T) {
		var channels = golang.ListChannelOnPeer(ctx, Peer0Icdd.AsGRPCClient(), *_crypto)
		assert.True(t, slices.Contains(channels, Channel))
	})
}
func TestFindKeyFilesOrPanic(t *testing.T) {
	var dirname = goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore/")
	utter.Dump(golang.FindKeyFilesOrPanic(dirname))
}
