package proposal

import (
	"crypto/rand"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
)

func GetRandomNonce() []byte {
	key := make([]byte, 24)
	_, err := rand.Read(key)
	if err != nil {
		panic(err)
	}
	return key
}

type Option = func(*peer.ChaincodeSpec)

func WithVersion(version string) Option {
	return func(spec *peer.ChaincodeSpec) {
		spec.ChaincodeId.Version = version
	}
}
func WithType(t peer.ChaincodeSpec_Type) Option {
	return func(spec *peer.ChaincodeSpec) {
		spec.Type = t
	}
}

func CreateProposal(creator []byte, channel, ccname string, args []string, transientMap map[string][]byte, options ...Option) (proposal *peer.Proposal, txid string, err error) {
	var argsInByte [][]byte
	for _, arg := range args {
		argsInByte = append(argsInByte, []byte(arg))
	}

	var spec = &peer.ChaincodeSpec{
		ChaincodeId: &peer.ChaincodeID{Name: ccname},
		Input:       &peer.ChaincodeInput{Args: argsInByte},
	}
	for _, option := range options {
		option(spec)
	}

	var invocation = &peer.ChaincodeInvocationSpec{ChaincodeSpec: spec}

	proposal, txid, err = protoutil.CreateChaincodeProposalWithTransient(common.HeaderType_ENDORSER_TRANSACTION, channel, invocation, creator, transientMap)
	return
}
