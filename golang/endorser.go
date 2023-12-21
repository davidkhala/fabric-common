package golang

import (
	"context"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"google.golang.org/grpc"
)

type Endorser struct {
	peer.EndorserClient
	context.Context
}

func EndorserFrom(connect *grpc.ClientConn) peer.EndorserClient {
	return peer.NewEndorserClient(connect)
}

func (endorser *Endorser) ProcessProposal(in *peer.SignedProposal) (*peer.ProposalResponse, error) {
	// pseudo overwrite
	if endorser.Context == nil {
		endorser.Context = goutils.GetGoContext()
	}
	return endorser.EndorserClient.ProcessProposal(endorser.Context, in)
}
