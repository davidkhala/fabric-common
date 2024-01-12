package event

import (
	"context"
	"fmt"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/ledger/rwset"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"google.golang.org/grpc"
	"io"
)

type ContinueFcn func(currentDeliverResponse DeliverResponseType, deliverResponses []DeliverResponseType) (bool, interface{})
type Eventer struct {
	peer.DeliverClient
	peer.Deliver_DeliverClient
	context.Context
	Continue ContinueFcn
}

func ContinueBuilder(continueFcns ...ContinueFcn) ContinueFcn {
	// TODO is it the best way to default a continueFcn?
	continueFcns = append([]ContinueFcn{func(this DeliverResponseType, deliverResponses []DeliverResponseType) (bool, interface{}) {
		switch {
		case this.Status != nil:

			switch *this.Status {
			case common.Status_SUCCESS, common.Status_NOT_FOUND:
				return false, *this.Status
			default:
				panic(fmt.Sprintf("Unknown DeliverResponse_Status=%s", *this.Status))
			}
		}
		return true, nil
	}}, continueFcns...)

	return func(currentDeliverResponse DeliverResponseType, deliverResponses []DeliverResponseType) (bool, interface{}) {
		for _, next := range continueFcns {
			ok, result := next(currentDeliverResponse, deliverResponses)
			if !ok {
				return ok, result
			}
		}
		return true, nil
	}
}

func NewEventer(ctx context.Context, connect *grpc.ClientConn) Eventer {
	deliverClient := peer.NewDeliverClient(connect)

	return Eventer{
		DeliverClient: deliverClient,
		Context:       ctx,
	}
}

type DeliverResponseType struct {
	*common.Status                                          // from peer.DeliverResponse_Status
	*common.Block                                           // from peer.DeliverResponse_Block or peer.DeliverResponse_BlockAndPrivateData
	*peer.FilteredBlock                                     // from peer.DeliverResponse_FilteredBlock
	PrivateDataMap      map[uint64]*rwset.TxPvtReadWriteSet // from peer.DeliverResponse_BlockAndPrivateData
}

func (eventer Eventer) SendRecv(seek *common.Envelope) (interface{}, []DeliverResponseType) {
	err := eventer.Send(seek)

	goutils.PanicError(err)
	var deliverResponses []DeliverResponseType
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
		var translated DeliverResponseType
		switch deliverResponseType.(type) {
		case *peer.DeliverResponse_Status:
			translated.Status = &deliverResponseType.(*peer.DeliverResponse_Status).Status
		case *peer.DeliverResponse_Block:
			translated.Block = deliverResponseType.(*peer.DeliverResponse_Block).Block
		case *peer.DeliverResponse_FilteredBlock:
			var filteredBlock = deliverResponseType.(*peer.DeliverResponse_FilteredBlock).FilteredBlock
			translated.FilteredBlock = filteredBlock
		case *peer.DeliverResponse_BlockAndPrivateData:
			var fullBlock = deliverResponseType.(*peer.DeliverResponse_BlockAndPrivateData).BlockAndPrivateData
			translated.Block = fullBlock.Block
			translated.PrivateDataMap = fullBlock.PrivateDataMap
		}

		deliverResponses = append(deliverResponses, translated)
		toContinue, receiptData = eventer.Continue(translated, deliverResponses)
		if !toContinue {
			break
		}
	}

	return receiptData, deliverResponses
}
