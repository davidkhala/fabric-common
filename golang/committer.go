package golang

import (
	"context"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/orderer"
	"google.golang.org/grpc"
)

type Committer struct {
	orderer.AtomicBroadcastClient
	orderer.AtomicBroadcast_BroadcastClient // not intrinsic
}

func CommitterFrom(connect *grpc.ClientConn) orderer.AtomicBroadcastClient {
	return orderer.NewAtomicBroadcastClient(connect)
}
func (committer *Committer) Setup(ctx context.Context) (err error) {
	if ctx == nil {
		ctx = goutils.GetGoContext()
	}
	committer.AtomicBroadcast_BroadcastClient, err = committer.AtomicBroadcastClient.Broadcast(ctx)

	return
}

func (committer *Committer) SendRecv(envelope *common.Envelope) (*orderer.BroadcastResponse, error) {

	err := committer.Send(envelope)
	if err != nil {
		return nil, err
	}

	return committer.AtomicBroadcast_BroadcastClient.Recv()
}
