package golang

import (
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/kortschak/utter"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestDeliverResponse(t *testing.T) {
	var empty = new(peer.DeliverResponse)
	utter.Dump(empty)
}
func TestGlue(t *testing.T) {
	var peerMissingFields = Node{
		Addr: "localhost:8051",

		SslTargetNameOverride: "peer0.icdd",
	}
	t.Run("AsGRPCClientOrPanic", func(t *testing.T) {
		assert.Panics(t, func() {
			peerMissingFields.AsGRPCClientOrPanic()
		})
	})
	t.Run("AsGRPCClient", func(t *testing.T) {
		_, err := peerMissingFields.AsGRPCClient()
		assert.ErrorContains(t, err, "[Bad Request]pem decode failed: certificate block not found")
	})

}
