package event

import (
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
)

type TransactionListener struct {
	BlockEventer
	ReceiptData string
}

func NewTransactionListener(eventer BlockEventer, txid string) TransactionListener {

	var listener = TransactionListener{
		BlockEventer: eventer,
		ReceiptData:  "",
	}
	listener.BlockEventer.Continue = eventer.ContinueBuilder(func(currentDeliverResponse interface{}, currentError error, deliverResponses []interface{}, errors []error) bool {
		switch currentDeliverResponse.(type) {
		case peer.DeliverResponse_BlockAndPrivateData:
			var actual = currentDeliverResponse.(peer.DeliverResponse_BlockAndPrivateData)
			var block = actual.BlockAndPrivateData.Block
			var txStatusCodes = block.Metadata.Metadata[common.BlockMetadataIndex_TRANSACTIONS_FILTER]

			for index, value := range block.Data.Data {
				envelope := protoutil.UnmarshalEnvelopeOrPanic(value)
				payload := protoutil.UnmarshalPayloadOrPanic(envelope.Payload)
				var txStatusCode = peer.TxValidationCode(txStatusCodes[index])
				var channelHeader = protoutil.UnmarshalChannelHeaderOrPanic(payload.Header.ChannelHeader)
				if channelHeader.Type == int32(common.HeaderType_ENDORSER_TRANSACTION) && txid == channelHeader.TxId {
					// found
					listener.ReceiptData = peer.TxValidationCode_name[int32(txStatusCode)]
					return false
				}
			}
		}
		return true
	})

	return listener

}

func (TransactionListener) GetSeekInfo() SeekInfo {

	return SeekInfoFrom(SeekNewest, SeekMax).WaitUtilReady()
}
