package event

import (
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
)

type TransactionListener struct {
	BlockEventer
}

func (t *TransactionListener) WaitForTx(txid string) {
	t.BlockEventer.Continue = ContinueBuilder(func(this DeliverResponseType, all []DeliverResponseType) (bool, interface{}) {
		switch {
		case this.FilteredBlock != nil:
			for _, value := range this.FilteredBlock.FilteredTransactions {
				if value.Type == common.HeaderType_ENDORSER_TRANSACTION && txid == value.Txid {
					// found
					return false, peer.TxValidationCode_name[int32(value.TxValidationCode)]
				}
			}

		case this.Block != nil:
			var block = this.Block
			var txStatusCodes = block.Metadata.Metadata[common.BlockMetadataIndex_TRANSACTIONS_FILTER]

			for index, value := range block.Data.Data {
				envelope := protoutil.UnmarshalEnvelopeOrPanic(value)
				payload := protoutil.UnmarshalPayloadOrPanic(envelope.Payload)
				var txStatusCode = peer.TxValidationCode(txStatusCodes[index])
				var channelHeader = protoutil.UnmarshalChannelHeaderOrPanic(payload.Header.ChannelHeader)
				if channelHeader.Type == int32(common.HeaderType_ENDORSER_TRANSACTION) && txid == channelHeader.TxId {
					// found
					return false, peer.TxValidationCode_name[int32(txStatusCode)]
				}
			}
		}

		return true, nil
	})
}

func (TransactionListener) GetSeekInfo() SeekInfo {

	var seek = SeekInfoFrom(SeekNewest, SeekMax)
	seek.WaitUtilReady()
	return *seek
}
