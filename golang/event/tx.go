package event

import (
	"github.com/davidkhala/fabric-common/golang/proto"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
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
					return false, value.TxValidationCode.String()
				}
			}

		case this.Block != nil:
			var block = this.Block
			var trimmed = proto.FromFullBlock(block)
			for _, value := range trimmed.TrimmedTransactions {
				if value.Type == common.HeaderType_ENDORSER_TRANSACTION && txid == value.Txid {
					// found
					return false, value.TxValidationCode.String()
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
