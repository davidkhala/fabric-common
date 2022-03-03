package golang

import (
	"github.com/hyperledger/fabric-protos-go/peer"
	"google.golang.org/grpc"
)

type Endorser struct {
	peer.EndorserClient
}

func EndorserFrom(connect *grpc.ClientConn) peer.EndorserClient {
	return peer.NewEndorserClient(connect)
}

func (endorser Endorser) ProcessProposal(in *peer.SignedProposal) (*peer.ProposalResponse, error) {
	// pseudo overwrite
	return endorser.EndorserClient.ProcessProposal(GetGoContext(), in)
}
