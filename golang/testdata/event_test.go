package testdata

import (
	"context"
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/fabric-common/golang/event"
	"github.com/davidkhala/fabric-common/golang/proto"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/stretchr/testify/assert"
	"os"
	"testing"
)

func TestEvent(t *testing.T) {

	var eventer = event.NewEventer(context.Background(), Peer0Icdd.AsGRPCClientOrPanic())

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
	if os.Getenv("mode") == "debug" {
		const txId = "6cc51d00c5a65b037c467aa3b06db312653544155afcf2d70bc8212fe3c6df7e" // replace with known one
		t.Run("waitForTx", func(t *testing.T) {
			var blockEventer = event.NewSimpleBlockEventer(eventer)
			var txEvent = event.TransactionListener{
				BlockEventer: blockEventer,
			}
			txEvent.WaitForTx(txId)
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
			txEvent.WaitForTx(txId)
			var seek = txEvent.GetSeekInfo()
			var _crypto = golang.LoadCryptoFrom(CryptoconfigAstri)
			result, _ := txEvent.SendRecv(seek.SignBy(Channel, _crypto))
			assert.Equal(t, peer.TxValidationCode_VALID.String(), result)
		})
	}

}
