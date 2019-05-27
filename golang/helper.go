package golang

import (
	"encoding/asn1"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric/common/util"
	"github.com/hyperledger/fabric/protos/common"
	"github.com/hyperledger/fabric/protoutil"
)

func ComputeCurrentBlockHash(height int64, data [][]byte, previousHash []byte) (currentBlockHash []byte) {
	var blockData = &common.BlockData{
		Data: data,
	}
	asn1Bytes, err := asn1.Marshal(struct {
		Number       int64
		PreviousHash []byte
		DataHash     []byte
	}{
		Number:       height,
		DataHash:     protoutil.BlockDataHash(blockData),
		PreviousHash: previousHash,
	})
	goutils.PanicError(err)
	return util.ComputeSHA256(asn1Bytes)
}
