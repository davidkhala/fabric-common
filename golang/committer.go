package golang

import (
	"context"
	"github.com/hyperledger/fabric-protos-go/orderer"
	"google.golang.org/grpc"
)

type Committer struct {
	orderer.AtomicBroadcastClient
	orderer.AtomicBroadcast_BroadcastClient // not intrinsic
	context.Context
}

func CommitterFrom(connect *grpc.ClientConn) orderer.AtomicBroadcastClient {
	return orderer.NewAtomicBroadcastClient(connect)
}
func (committer *Committer) Setup() (err error) {
	if committer.Context == nil {
		committer.Context = GetGoContext()
	}
	committer.AtomicBroadcast_BroadcastClient, err = committer.AtomicBroadcastClient.Broadcast(committer.Context)

	return
}
