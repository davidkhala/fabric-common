package event

import (
	"github.com/davidkhala/goutils"
)

type BlockEventer struct {
	Eventer
}

func NewBlockEventer(eventer Eventer) BlockEventer {
	client, err := eventer.DeliverClient.DeliverWithPrivateData(eventer.Context) // always get most info
	goutils.PanicError(err)
	eventer.Deliver_DeliverClient = client
	return BlockEventer{
		Eventer: eventer,
	}

}
