package testdata

import (
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/fabric-common/golang/proposal"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestCreateProposal(t *testing.T) {
	var crypto = golang.LoadCryptoFrom(CryptoconfigAstri)
	var creator = crypto.Creator
	p, txid, err := proposal.CreateProposal(creator, "allchannel", "contracts", []string{}, nil, proposal.WithType(peer.ChaincodeSpec_GOLANG), proposal.WithVersion("1"))
	assert.NoError(t, err)
	println(txid)
	println(p.String())
}
