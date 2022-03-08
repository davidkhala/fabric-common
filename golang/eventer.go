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
	ReceiptData  interface{}
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

type SeekInfo struct {
	*orderer.SeekInfo
}

// WaitUtilReady will wait for future block
// Commonly used for: Wait for next block, confirming tx finality
func (seekInfo SeekInfo) WaitUtilReady() SeekInfo {
	seekInfo.Behavior = orderer.SeekInfo_BLOCK_UNTIL_READY
	return seekInfo
}

// Fetch will only get current existing blocks.
// Commonly used for: get genesis block, query block content
func (seekInfo SeekInfo) Fetch() SeekInfo {
	seekInfo.Behavior = orderer.SeekInfo_FAIL_IF_NOT_READY
	return seekInfo
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

// AsTransactionListener return a proper SeekInfo
func (eventer *Eventer) AsTransactionListener(txid string) SeekInfo {
	eventer.ReceiptData = nil
	eventer.Continue = func(currentDeliverResponse *peer.DeliverResponse, currentError error, deliverResponses []*peer.DeliverResponse, errors []error) bool {
		if currentError == io.EOF {
			return false
		} else if currentError != nil {
			panic(currentError)
		}

		switch currentDeliverResponse.Type.(type) {
		case *peer.DeliverResponse_BlockAndPrivateData:
			var full_block = currentDeliverResponse.GetBlockAndPrivateData()
			var block = full_block.Block
			var txStatusCodes = block.Metadata.Metadata[common.BlockMetadataIndex_TRANSACTIONS_FILTER]

			for index, value := range block.Data.Data {
				envelope := protoutil.UnmarshalEnvelopeOrPanic(value)
				payload := protoutil.UnmarshalPayloadOrPanic(envelope.Payload)
				var txStatusCode = peer.TxValidationCode(txStatusCodes[index])
				var channel_header = protoutil.UnmarshalChannelHeaderOrPanic(payload.Header.ChannelHeader)
				if channel_header.Type == int32(common.HeaderType_ENDORSER_TRANSACTION) && txid == channel_header.TxId {
					// found
					eventer.ReceiptData = peer.TxValidationCode_name[int32(txStatusCode)]
					return false
				}
			}
		}
		return true
	}
	return SeekInfoFrom(SeekNewest, SeekMax).WaitUtilReady()
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
