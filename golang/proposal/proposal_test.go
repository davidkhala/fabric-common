package proposal

import (
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/fabric-common/golang/testdata"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestCreateProposal(t *testing.T) {
	var crypto = golang.LoadCryptoFrom(testdata.CryptoconfigAstri)
	var creator = crypto.Creator
	p, txid, err := CreateProposal(creator, "allchannel", "contracts", []string{}, nil, WithType(peer.ChaincodeSpec_GOLANG), WithVersion("1"))
	assert.NoError(t, err)
	println(txid)
	println(p.String())
}
