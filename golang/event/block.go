package event

import (
	"github.com/davidkhala/goutils"
)

type BlockEventer struct {
	Eventer
}

func NewBlockEventer(eventer Eventer, continueFcns ...ContinueFcn) BlockEventer {
	client, err := eventer.DeliverClient.DeliverWithPrivateData(eventer.Context) // always get most info
	goutils.PanicError(err)
	eventer.Deliver_DeliverClient = client

	eventer.Continue = ContinueBuilder(continueFcns...)
	return BlockEventer{
		Eventer: eventer,
	}

}
