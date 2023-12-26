package golang

import (
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/kortschak/utter"
	"testing"
)

func TestDeliverResponse(t *testing.T) {
	var empty = new(peer.DeliverResponse)
	utter.Dump(empty)

}
