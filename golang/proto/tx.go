package proto

import (
	"bytes"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/ledger/rwset"
	"github.com/hyperledger/fabric-protos-go-apiv2/msp"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer/lifecycle"
	"github.com/pkg/errors"
	"google.golang.org/protobuf/proto"
)

type Transaction struct {
	TxType common.HeaderType
	*common.SignatureHeader
	*msp.SerializedIdentity
	*common.Config                                        // if TxType==common.HeaderType_CONFIG
	*common.ConfigUpdateEnvelope                          // if TxType==common.HeaderType_CONFIG_UPDATE or TxType==common.HeaderType_CONFIG
	ChaincodeActions             []ChaincodeActionPayload // if TxType==common.HeaderType_ENDORSER_TRANSACTION
}

func ParseTransaction(txBody *common.Payload) (t Transaction) {
	var channelHeader = protoutil.UnmarshalChannelHeaderOrPanic(txBody.Header.ChannelHeader)
	t.TxType = common.HeaderType(channelHeader.Type)
	t.SignatureHeader = protoutil.UnmarshalSignatureHeaderOrPanic(txBody.Header.SignatureHeader)
	t.SerializedIdentity = GetCreatorFromSignatureHeader(t.SignatureHeader)
	switch t.TxType {

	case common.HeaderType_CONFIG:
		config, err := protoutil.UnmarshalConfigEnvelope(txBody.Data)
		goutils.PanicError(err)
		t.Config = config.Config
		if config.LastUpdate != nil { // in genesis block, nil is expected, in setAnchor tx, non-nil is expected
			configUpdate, err := protoutil.EnvelopeToConfigUpdate(config.LastUpdate)
			goutils.PanicError(err)
			t.ConfigUpdateEnvelope = configUpdate
		}

	case common.HeaderType_CONFIG_UPDATE:
		configUpdateEnv := &common.ConfigUpdateEnvelope{}
		err := proto.Unmarshal(txBody.Data, configUpdateEnv)
		goutils.PanicError(err)
		t.ConfigUpdateEnvelope = configUpdateEnv
	case common.HeaderType_ENDORSER_TRANSACTION:
		cche, err := protoutil.UnmarshalChaincodeHeaderExtension(channelHeader.Extension)
		goutils.PanicError(err)
		transaction, err := protoutil.UnmarshalTransaction(txBody.Data)
		goutils.PanicError(err)
		if len(transaction.Actions) != 1 {
			panic(transaction.String())
		}
		for _, action := range transaction.Actions {
			goutils.AssertOK(bytes.Equal(action.Header, txBody.Header.SignatureHeader), "logic change on fabric function protoutil.CreateSignedTx")

			var chaincodeActionPayload = NewChaincodeActionPayload(action)

			var chaincodeSpec = chaincodeActionPayload.ChaincodeProposalPayload.ChaincodeSpec
			var args = chaincodeSpec.Input.Args
			var fcn = string(args[0])
			var remainArgs = args[1:]

			if cche.ChaincodeId.Name == LifecycleName {
				goutils.AssertNil(chaincodeActionPayload.ChaincodeProposalPayload.TransientMap, "chaincode lifecycle operation should have nil transientMap")
				goutils.AssertOK(chaincodeSpec.ChaincodeId.Name == LifecycleName, "ChaincodeSpec.ChaincodeId.Name != LifecycleName in _lifecycle transaction")
				goutils.AssertOK(chaincodeSpec.Type == peer.ChaincodeSpec_GOLANG, "chaincode lifecycle should be a golang chaincode")

				switch fcn {
				case ApproveFuncName:
					if len(remainArgs) != 1 {
						panic(ApproveFuncName + " has invalid args length")
					}
					var argObject lifecycle.ApproveChaincodeDefinitionForMyOrgArgs

					err = proto.Unmarshal(remainArgs[0], &argObject)
					goutils.PanicError(err)

				case CommitFuncName:
					if len(remainArgs) != 1 {
						panic(CommitFuncName + " has invalid args length")
					}
					var argObject lifecycle.CommitChaincodeDefinitionArgs
					err = proto.Unmarshal(remainArgs[0], &argObject)
					goutils.PanicError(err)
				default:
					panic("unknown function in lifecycle chaincode")
				}

			}
			t.ChaincodeActions = append(t.ChaincodeActions, chaincodeActionPayload)
		}

	default:
		panic(errors.Errorf("invalid header type %s", common.HeaderType_name[channelHeader.Type]))
	}

	return
}

type ChaincodeActionPayload struct {
	ChaincodeProposalPayload ChaincodeProposalPayload
	Action                   ChaincodeEndorsedAction
}
type ChaincodeProposalPayload struct {
	ChaincodeSpec *peer.ChaincodeSpec
	TransientMap  map[string][]byte `protobuf:"bytes,2,rep,name=TransientMap,proto3" json:"TransientMap,omitempty" protobuf_key:"bytes,1,opt,name=key,proto3" protobuf_val:"bytes,2,opt,name=value,proto3"`
}

type ChaincodeEndorsedAction struct {
	ProposalResponsePayload ProposalResponsePayload
	Endorsements            []*peer.Endorsement
}

type ProposalResponsePayload struct {
	ProposalHash []byte

	Extension ChaincodeAction
}
type ChaincodeAction struct {

	// This field contains the read set and the write set produced by the
	// chaincode executing this invocation.
	Results *rwset.TxReadWriteSet
	Events  *peer.ChaincodeEvent
	// This field contains the result of executing this invocation.
	Response *peer.Response

	ChaincodeId *peer.ChaincodeID `protobuf:"bytes,4,opt,name=chaincode_id,json=chaincodeId,proto3" json:"chaincode_id,omitempty"`
}

// NewChaincodeActionPayload gets the underlying payload objects in a TransactionAction
func NewChaincodeActionPayload(txActions *peer.TransactionAction) (r ChaincodeActionPayload) {

	chaincodeActionPayload, err := protoutil.UnmarshalChaincodeActionPayload(txActions.Payload)
	goutils.PanicError(err)
	var ccProposalPayloadBytes = chaincodeActionPayload.ChaincodeProposalPayload

	chaincodeProposalPayload, err := protoutil.UnmarshalChaincodeProposalPayload(ccProposalPayloadBytes)
	goutils.PanicError(err)
	cis, err := protoutil.UnmarshalChaincodeInvocationSpec(chaincodeProposalPayload.Input)
	goutils.PanicError(err)

	r.ChaincodeProposalPayload = ChaincodeProposalPayload{
		ChaincodeSpec: cis.ChaincodeSpec,
		TransientMap:  chaincodeProposalPayload.TransientMap,
	}

	r.Action = ChaincodeEndorsedAction{
		Endorsements: chaincodeActionPayload.Action.Endorsements,
	}

	pRespPayload, err := protoutil.UnmarshalProposalResponsePayload(chaincodeActionPayload.Action.ProposalResponsePayload)
	goutils.PanicError(err)
	r.Action.ProposalResponsePayload = ProposalResponsePayload{
		ProposalHash: pRespPayload.ProposalHash,
	}

	chaincodeAction, err := protoutil.UnmarshalChaincodeAction(pRespPayload.Extension)
	goutils.PanicError(err)
	chaincodeEvent, err := protoutil.UnmarshalChaincodeEvents(chaincodeAction.Events)
	goutils.PanicError(err)
	rwSet, err := protoutil.UnmarshalTxReadWriteSet(chaincodeAction.Results)
	goutils.PanicError(err)
	r.Action.ProposalResponsePayload.Extension = ChaincodeAction{
		Results:     rwSet,
		Events:      chaincodeEvent,
		Response:    chaincodeAction.Response,
		ChaincodeId: chaincodeAction.ChaincodeId,
	}

	return
}

func GetCreatorFromSignatureHeader(signatureHeader *common.SignatureHeader) (creator *msp.SerializedIdentity) {
	creator, err := protoutil.UnmarshalSerializedIdentity(signatureHeader.Creator)
	goutils.PanicError(err)
	return creator
}
