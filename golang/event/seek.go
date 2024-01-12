package event

import (
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/orderer"
	"math"
)

var SeekOldest = &orderer.SeekPosition{
	Type: &orderer.SeekPosition_Oldest{
		Oldest: &orderer.SeekOldest{},
	},
}
var SeekNewest = &orderer.SeekPosition{
	Type: &orderer.SeekPosition_Newest{
		Newest: &orderer.SeekNewest{},
	},
}
var SeekMax = &orderer.SeekPosition{
	Type: &orderer.SeekPosition_Specified{
		Specified: &orderer.SeekSpecified{
			Number: math.MaxUint64,
		},
	},
}

type SeekInfo struct {
	*orderer.SeekInfo
}

// WaitUtilReady will wait for future block
// Commonly used for: Wait for next block, confirming tx finality
func (seekInfo *SeekInfo) WaitUtilReady() *SeekInfo {
	seekInfo.Behavior = orderer.SeekInfo_BLOCK_UNTIL_READY
	return seekInfo
}

// Fetch will only get current existing blocks.
// Commonly used for: get genesis block, query block content
func (seekInfo *SeekInfo) Fetch() *SeekInfo {
	seekInfo.Behavior = orderer.SeekInfo_FAIL_IF_NOT_READY
	return seekInfo
}

func (seekInfo SeekInfo) SignBy(channel string, signer protoutil.Signer) *common.Envelope {
	var envelop, err = protoutil.CreateSignedEnvelope(
		common.HeaderType_DELIVER_SEEK_INFO,
		channel,
		signer,
		seekInfo.SeekInfo,
		0,
		0,
	)
	goutils.PanicError(err)
	return envelop
}
func SeekInfoFrom(start, stop *orderer.SeekPosition) *SeekInfo {
	return &SeekInfo{
		&orderer.SeekInfo{
			Start: start,
			Stop:  stop,
		},
	}
}
