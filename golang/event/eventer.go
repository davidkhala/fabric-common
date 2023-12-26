package event

import (
	"context"
	"errors"
	"fmt"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"google.golang.org/grpc"
	"io"
)

type ContinueFcn func(currentDeliverResponse interface{}, currentError error, deliverResponses []interface{}, errors []error) (bool, interface{})
type Eventer struct {
	peer.DeliverClient
	peer.Deliver_DeliverClient
	context.Context
	Continue     ContinueFcn
	ErrorReducer func(errors []error) error
}

func (Eventer) ContinueBuilder(next ContinueFcn) ContinueFcn {

	return func(currentDeliverResponse interface{}, currentError error, deliverResponses []interface{}, _errors []error) (bool, interface{}) {
		if currentError == io.EOF {
			return false, nil
		} else if currentError != nil {
			panic(currentError)
		}

		switch currentDeliverResponse.(type) {
		case *peer.DeliverResponse_Status:
		case *peer.DeliverResponse_Block:
		case *peer.DeliverResponse_FilteredBlock:
		case *peer.DeliverResponse_BlockAndPrivateData:
		default:
			panic(fmt.Sprintf("Unknown DeliverResponse type=%T", currentDeliverResponse))
		}
		return next(currentDeliverResponse, currentError, deliverResponses, _errors)
	}
}

// SetDefaultContinue TODO
func (e *Eventer) SetDefaultContinue() {
	e.Continue = e.ContinueBuilder(func(currentDeliverResponse interface{}, currentError error, deliverResponses []interface{}, errors []error) (bool, interface{}) {
		switch currentDeliverResponse.(type) {
		case peer.DeliverResponse_Status:
			var status = currentDeliverResponse.(peer.DeliverResponse_Status)
			switch status.Status {
			case common.Status_SUCCESS, common.Status_NOT_FOUND:
				return false, status.Status
			}
		}
		return true, nil
	})
}

func NewEventer(ctx context.Context, connect *grpc.ClientConn) Eventer {
	deliverClient := peer.NewDeliverClient(connect)

	return Eventer{
		DeliverClient: deliverClient,
		Context:       ctx,
		ErrorReducer: func(errorsSlice []error) error {

			var errorSum = ""
			for index, value := range errorsSlice {
				if value != nil && value != io.EOF {
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

func (eventer Eventer) SendRecv(seek *common.Envelope) (interface{}, []interface{}, error) {
	err := eventer.Send(seek)

	if err != nil {
		return nil, nil, err
	}
	var deliverResponses []interface{}
	var errorSlice []error // TODO Do we really need error reducer, how about panic on single error?
	var receiptData interface{}
	var toContinue bool
	for {
		deliverResponse, recvErr := eventer.Recv()
		var deliverResponseType = (*deliverResponse).Type
		deliverResponses = append(deliverResponses, deliverResponseType)
		errorSlice = append(errorSlice, recvErr)
		toContinue, receiptData = eventer.Continue(deliverResponseType, recvErr, deliverResponses, errorSlice)
		if !toContinue {
			break
		}
	}

	return receiptData, deliverResponses, eventer.ErrorReducer(errorSlice)
}
