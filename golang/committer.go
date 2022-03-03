package golang

import (
	"context"
	"github.com/hyperledger/fabric-protos-go/common"
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

func (committer *Committer) SendRecv(envelope *common.Envelope) (*orderer.BroadcastResponse, error) {
	responsesChannel := make(chan *orderer.BroadcastResponse)
	errorChannel := make(chan error)
	defer func() {
		close(responsesChannel)
		close(errorChannel)
	}()
	go func() {
		// only one try
		broadcastResponse, err := committer.AtomicBroadcast_BroadcastClient.Recv()
		errorChannel <- err
		responsesChannel <- broadcastResponse
	}()
	err := committer.Send(envelope)
	if err != nil {
		return nil, err
	}

	err = <-errorChannel
	responses := <-responsesChannel
	return responses, err
}
