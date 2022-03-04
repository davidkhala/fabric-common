package golang

import (
	"context"
	"errors"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go/common"
	"github.com/hyperledger/fabric-protos-go/orderer"
	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/hyperledger/fabric/protoutil"
	"google.golang.org/grpc"
	"math"
)

type Eventer struct {
	peer.DeliverClient
	context.Context
	peer.Deliver_DeliverWithPrivateDataClient
	Continue     func(currentDeliverResponse *peer.DeliverResponse, currentError error, deliverResponses []*peer.DeliverResponse, errors []error) bool
	ErrorReducer func(errors []error) string
}

var SeekNewest = &orderer.SeekPosition{
	Type: &orderer.SeekPosition_Newest{
		Newest: &orderer.SeekNewest{},
	},
}
var SeekMax = &orderer.SeekPosition{
	Type: &orderer.SeekPosition_Specified{
		Specified: &orderer.SeekSpecified{
			Number: math.MaxUint64,
		},
	},
}

func EventerFrom(ctx context.Context, connect *grpc.ClientConn) Eventer {
	deliverClient := peer.NewDeliverClient(connect)
	client, err := deliverClient.DeliverWithPrivateData(ctx) // always get most info
	goutils.PanicError(err)
	return Eventer{
		DeliverClient:                        deliverClient,
		Context:                              ctx,
		Deliver_DeliverWithPrivateDataClient: client,
		Continue: func(currentDeliverResponse *peer.DeliverResponse, currentError error, deliverResponses []*peer.DeliverResponse, errors []error) bool {
			return false // default to break immediately
		},
		ErrorReducer: func(errors []error) string {
			var errorSum = ""
			for index, value := range errors {
				if value != nil {
					errorSum += "[" + string(rune(index)) + "]" + value.Error() + `\n`
					break
				}
			}
			return errorSum
		},
	}
}

type SeekInfo struct {
	*orderer.SeekInfo
}

func (seekInfo SeekInfo) SignBy(channel string, signer protoutil.Signer) (*common.Envelope, error) {
	return protoutil.CreateSignedEnvelope(
		common.HeaderType_DELIVER_SEEK_INFO,
		channel,
		signer,
		seekInfo.SeekInfo,
		0,
		0,
	)
}
func SeekInfoFrom(start, stop *orderer.SeekPosition) SeekInfo {
	return SeekInfo{
		&orderer.SeekInfo{
			Start:    start,
			Stop:     stop,
			Behavior: orderer.SeekInfo_BLOCK_UNTIL_READY,
		},
	}
}

func (eventer Eventer) SendRecv(seek *common.Envelope) ([]*peer.DeliverResponse, error) {
	var errorsChannel chan []error
	var deliverResponsesChannel chan []*peer.DeliverResponse
	defer func() {
		close(errorsChannel)
		close(deliverResponsesChannel)
	}()
	go func() {
		var deliverResponses []*peer.DeliverResponse
		var errorSlice []error

		for {
			deliverResponse, err := eventer.Recv()

			deliverResponses = append(deliverResponses, deliverResponse)
			errorSlice = append(errorSlice, err)
			if !eventer.Continue(deliverResponse, err, deliverResponses, errorSlice) {
				errorsChannel <- errorSlice
				deliverResponsesChannel <- deliverResponses

				return
			}
		}

	}()
	err := eventer.Send(seek)

	if err != nil {
		return nil, err
	}
	return <-deliverResponsesChannel, errors.New(eventer.ErrorReducer(<-errorsChannel))
}
