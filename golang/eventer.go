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
	"io"
	"math"
)

type Eventer struct {
	peer.DeliverClient
	context.Context
	peer.Deliver_DeliverWithPrivateDataClient
	Continue     func(currentDeliverResponse *peer.DeliverResponse, currentError error, deliverResponses []*peer.DeliverResponse, errors []error) bool
	ErrorReducer func(errors []error) error
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
			if currentError == io.EOF {
				return false
			} else if currentError != nil {
				panic(currentError)
			}
			switch currentDeliverResponse.Type.(type) {
			case *peer.DeliverResponse_Status:
				var status = currentDeliverResponse.Type.(*peer.DeliverResponse_Status)
				switch status.Status {
				case common.Status_SUCCESS, common.Status_NOT_FOUND:
					return false
				}
			}
			return true
		},
		ErrorReducer: func(errorsSlice []error) error {

			var errorSum = ""
			for index, value := range errorsSlice {
				if value != nil {
					errorSum += "[" + string(rune(index)) + "]" + value.Error() + `\n`
					break
				}
			}
			if errorSum == "" {
				return nil
			}
			return errors.New(errorSum)
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
			Behavior: orderer.SeekInfo_FAIL_IF_NOT_READY,
		},
	}
}

func (eventer Eventer) SendRecv(seek *common.Envelope) ([]*peer.DeliverResponse, error) {
	err := eventer.Send(seek)

	if err != nil {
		return nil, err
	}
	var deliverResponses []*peer.DeliverResponse
	var errorSlice []error

	for {
		deliverResponse, recvErr := eventer.Recv()
		deliverResponses = append(deliverResponses, deliverResponse)
		errorSlice = append(errorSlice, recvErr)
		if !eventer.Continue(deliverResponse, recvErr, deliverResponses, errorSlice) {
			break
		}
	}

	return deliverResponses, eventer.ErrorReducer(errorSlice)
}
