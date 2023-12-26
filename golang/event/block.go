package event

import (
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
)

type BlockEventer struct {
	Eventer
	peer.Deliver_DeliverWithPrivateDataClient
}

func NewBlockEventer(eventer Eventer) BlockEventer {
	client, err := eventer.DeliverClient.DeliverWithPrivateData(eventer.Context) // always get most info
	goutils.PanicError(err)
	return BlockEventer{
		Eventer:                              eventer,
		Deliver_DeliverWithPrivateDataClient: client,
	}

}
