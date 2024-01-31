package golang

import (
	"context"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-admin-sdk/pkg/channel"
	"google.golang.org/grpc"
)

func ListChannelOnPeer(ctx context.Context, connection grpc.ClientConnInterface, crypto Crypto) (results []string) {
	channels, err := channel.ListChannelOnPeer(ctx, connection, crypto)
	goutils.PanicError(err)
	for _, channelInfo := range channels {
		results = append(results, channelInfo.ChannelId)
	}
	return
}
