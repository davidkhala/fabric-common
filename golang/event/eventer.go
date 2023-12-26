package event

import (
	"context"
	"fmt"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"google.golang.org/grpc"
	"io"
)

type ContinueFcn func(currentDeliverResponse interface{}, deliverResponses []interface{}) (bool, interface{})
type Eventer struct {
	peer.DeliverClient
	peer.Deliver_DeliverClient
	context.Context
	Continue ContinueFcn
}

func (Eventer) ContinueBuilder(next ContinueFcn) ContinueFcn {

	return func(currentDeliverResponse interface{}, deliverResponses []interface{}) (bool, interface{}) {
		switch currentDeliverResponse.(type) {
		case *peer.DeliverResponse_Status:
			var status = currentDeliverResponse.(*peer.DeliverResponse_Status)
			switch status.Status {
			case common.Status_SUCCESS, common.Status_NOT_FOUND:
				return false, status.Status
			default:
				panic(fmt.Sprintf("Unknown DeliverResponse_Status=%s", status.Status))
			}
		case *peer.DeliverResponse_Block:
		case *peer.DeliverResponse_FilteredBlock:
		case *peer.DeliverResponse_BlockAndPrivateData:
		default:
			panic(fmt.Sprintf("Unknown DeliverResponse type=%T", currentDeliverResponse))
		}
		return next(currentDeliverResponse, deliverResponses)
	}
}

func NewEventer(ctx context.Context, connect *grpc.ClientConn) Eventer {
	deliverClient := peer.NewDeliverClient(connect)

	return Eventer{
		DeliverClient: deliverClient,
		Context:       ctx,
	}
}

func (eventer Eventer) SendRecv(seek *common.Envelope) (interface{}, []interface{}) {
	err := eventer.Send(seek)

	goutils.PanicError(err)
	var deliverResponses []interface{}
	var receiptData interface{}
	var toContinue bool
	for {
		deliverResponse, recvErr := eventer.Recv()
		if recvErr == io.EOF && deliverResponse == nil {
			break
		} else if recvErr != nil {
			panic(recvErr)
		}
		var deliverResponseType = (*deliverResponse).Type
		deliverResponses = append(deliverResponses, deliverResponseType)
		toContinue, receiptData = eventer.Continue(deliverResponseType, deliverResponses)
		if !toContinue {
			break
		}
	}

	return receiptData, deliverResponses
}
