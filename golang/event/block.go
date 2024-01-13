package event

import (
	"github.com/davidkhala/goutils"
)

type BlockEventer struct {
	Eventer
}

func NewBlockEventer(eventer Eventer, continueFcns ...ContinueFcn) BlockEventer {
	client, err := eventer.DeliverClient.DeliverWithPrivateData(eventer.Context)
	goutils.PanicError(err)
	eventer.Deliver_DeliverClient = client

	eventer.Continue = ContinueBuilder(continueFcns...)
	return BlockEventer{
		Eventer: eventer,
	}
}

func NewSimpleBlockEventer(eventer Eventer) BlockEventer {
	client, err := eventer.DeliverClient.DeliverFiltered(eventer.Context)
	goutils.PanicError(err)
	eventer.Deliver_DeliverClient = client
	return BlockEventer{
		Eventer: eventer,
	}
}
