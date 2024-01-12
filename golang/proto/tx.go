package proto

import (
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/msp"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/pkg/errors"
	"google.golang.org/protobuf/proto"
)

type Transaction struct {
	TxType common.HeaderType
	*common.SignatureHeader
	*msp.SerializedIdentity
	*common.Config               // if TxType==common.HeaderType_CONFIG
	*common.ConfigUpdateEnvelope // if TxType==common.HeaderType_CONFIG_UPDATE
	*peer.ChaincodeActionPayload // if TxType==common.HeaderType_ENDORSER_TRANSACTION
	*peer.ChaincodeAction        // if TxType==common.HeaderType_ENDORSER_TRANSACTION
}

func (t Transaction) GetType() string {
	return common.HeaderType_name[int32(t.TxType)]
}

func ParseTransaction(txBody *common.Payload) (t Transaction) {
	var channelHeader = GetChannelHeaderFromPayload(txBody)
	t.TxType = common.HeaderType(channelHeader.Type)
	t.SignatureHeader = protoutil.UnmarshalSignatureHeaderOrPanic(txBody.Header.SignatureHeader)
	t.SerializedIdentity = GetCreatorFromSignatureHeader(t.SignatureHeader)
	switch t.TxType {

	case common.HeaderType_CONFIG:
		config, err := protoutil.UnmarshalConfigEnvelope(txBody.Data)
		goutils.PanicError(err)
		t.Config = config.Config
	case common.HeaderType_CONFIG_UPDATE:
		configUpdateEnv := &common.ConfigUpdateEnvelope{}
		err := proto.Unmarshal(txBody.Data, configUpdateEnv)
		goutils.PanicError(err)
		t.ConfigUpdateEnvelope = configUpdateEnv
	case common.HeaderType_ENDORSER_TRANSACTION:
		txAction := protoutil.UnmarshalTransactionActionOrPanic(txBody.Data)
		p, a, err := protoutil.GetPayloads(txAction)
		goutils.PanicError(err)
		t.ChaincodeActionPayload = p
		t.ChaincodeAction = a
	default:
		panic(errors.Errorf("invalid header type %s", common.HeaderType_name[channelHeader.Type]))
	}

	return
}
func GetChannelHeaderFromPayload(payload *common.Payload) *common.ChannelHeader {
	return protoutil.UnmarshalChannelHeaderOrPanic(payload.Header.ChannelHeader)
}
func GetCreatorFromSignatureHeader(signatureHeader *common.SignatureHeader) (creator *msp.SerializedIdentity) {
	creator, err := protoutil.UnmarshalSerializedIdentity(signatureHeader.Creator)
	goutils.PanicError(err)
	return creator
}
