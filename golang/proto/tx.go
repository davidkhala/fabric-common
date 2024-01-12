package proto

import (
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
)

type Transaction struct {
	TxType common.HeaderType
}

func ParseTransaction(txBody *common.Payload) (t Transaction) {
	var channelHeader = GetChannelHeaderFromPayload(txBody)
	t.TxType = common.HeaderType(channelHeader.Type)
	protoutil.UnmarshalConfigEnvelope()
	txBody.Data

}
func GetChannelHeaderFromPayload(payload *common.Payload) *common.ChannelHeader {
	return protoutil.UnmarshalChannelHeaderOrPanic(payload.Header.ChannelHeader)
}
