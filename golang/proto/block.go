package proto

import (
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"google.golang.org/protobuf/proto"
)

// TrimmedBlock is a simulation of peer.FilteredBlock
type TrimmedBlock struct {
	ChannelId           string
	Number              uint64
	TrimmedTransactions []TrimmedTransaction
}

// TrimmedTransaction is a simulation of peer.FilteredTransaction
type TrimmedTransaction struct {
	Txid             string
	Type             common.HeaderType
	TxValidationCode peer.TxValidationCode
	ChaincodeActions []*peer.ChaincodeEvent
}

func (t *TrimmedTransaction) Fill(transaction Transaction) {
	t.Txid = transaction.TxId
	t.Type = transaction.TxType
	for _, action := range transaction.ChaincodeActions {
		t.ChaincodeActions = append(t.ChaincodeActions, action.Action.ProposalResponsePayload.Extension.Events)
	}
}

func FromFullBlock(block *common.Block) (trimmedBlock TrimmedBlock) {
	trimmedBlock.Number = block.Header.Number
	var txStatusCodes = block.Metadata.Metadata[common.BlockMetadataIndex_TRANSACTIONS_FILTER]

	for index, data := range block.Data.Data {

		var envelop = &common.Envelope{}
		err := proto.Unmarshal(data, envelop)
		goutils.PanicError(err)

		var payload = protoutil.UnmarshalPayloadOrPanic(envelop.Payload)
		var channelHeader = protoutil.UnmarshalChannelHeaderOrPanic(payload.Header.ChannelHeader)
		trimmedBlock.ChannelId = channelHeader.ChannelId

		var tx = TrimmedTransaction{
			TxValidationCode: peer.TxValidationCode(txStatusCodes[index]),
		}
		tx.Fill(ParseTransaction(payload))

		trimmedBlock.TrimmedTransactions = append(trimmedBlock.TrimmedTransactions, tx)
	}
	return
}
