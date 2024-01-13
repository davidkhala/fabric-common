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

func EndorserFrom(ctx context.Context, connect *grpc.ClientConn) Endorser {
	if ctx == nil {
		ctx = goutils.GetGoContext()
	}
	return Endorser{
		EndorserClient: peer.NewEndorserClient(connect),
		Context:        ctx,
	}
}

func (endorser *Endorser) ProcessProposal(in *peer.SignedProposal) (*peer.ProposalResponse, error) {
	return endorser.EndorserClient.ProcessProposal(endorser.Context, in)
}
