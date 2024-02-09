package proposal

import (
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestCreateProposal(t *testing.T) {

	p, txid, err := CreateProposal(nil, "allchannel", "contracts", []string{}, nil, WithType(peer.ChaincodeSpec_GOLANG), WithVersion("1"))

	assert.NoError(t, err)
	assert.NotEqual(t, "2d07e79724324b4a6bcdc9ac285d01434897a5e16ec7f9de7d4bc4d27f81677b", txid)
	assert.NotEmpty(t, p.Header)
	assert.NotEmpty(t, p.Payload)
}
