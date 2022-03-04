package golang

import (
	"crypto/rand"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	"github.com/hyperledger/fabric-protos-go/common"
	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/hyperledger/fabric/protoutil"
)

func GetRandomNonce() []byte {
	key := make([]byte, 24)
	_, err := rand.Read(key)
	if err != nil {
		panic(err)
	}
	return key
}

func CreateProposal(signer *tape.Crypto, channel, ccname, version string, args ...string) (proposal *peer.Proposal, txid string, err error) {
	var argsInByte [][]byte
	for _, arg := range args {
		argsInByte = append(argsInByte, []byte(arg))
	}

	spec := &peer.ChaincodeSpec{
		Type:        peer.ChaincodeSpec_GOLANG,
		ChaincodeId: &peer.ChaincodeID{Name: ccname, Version: version},
		Input:       &peer.ChaincodeInput{Args: argsInByte},
	}

	invocation := &peer.ChaincodeInvocationSpec{ChaincodeSpec: spec}

	creator, err := signer.Serialize()
	if err != nil {
		return nil, "", err
	}

	prop, txid, err := protoutil.CreateChaincodeProposal(common.HeaderType_ENDORSER_TRANSACTION, channel, invocation, creator)
	if err != nil {
		return nil, "", err
	}

	return prop, txid, nil
}
