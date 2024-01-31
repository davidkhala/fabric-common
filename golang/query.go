package golang

import (
	"context"
	"github.com/davidkhala/fabric-common/golang/format"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-admin-sdk/pkg/channel"
	"github.com/hyperledger/fabric-contract-api-go/metadata"
	"github.com/hyperledger/fabric-gateway/pkg/client"
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

// Only works when using the Contract API for your chaincode implementation
// , your chaincode should have a "org.hyperledger.fabric:GetMetadata" transaction function that will provide you with information on the smart contracts and transaction functions contained in the chaincode.
// TODO move to admin-sdk
func GetContractMetadata(ctx context.Context, connection grpc.ClientConnInterface, signingIdentity format.MessageSigningIdentity, channelID, chaincodeName string) (cm metadata.ContractChaincodeMetadata) {
	gateway, err := client.Connect(signingIdentity,
		client.WithClientConnection(connection),
		client.WithSign(signingIdentity.Sign),
		client.WithHash(signingIdentity.Digest),
	)
	goutils.PanicError(err)
	defer func(gateway *client.Gateway) {
		_err := gateway.Close()
		if _err != nil {
			panic(_err)
		}
	}(gateway)
	var network = gateway.GetNetwork(channelID)
	var contract = network.GetContract(chaincodeName)
	bytes, err := contract.EvaluateWithContext(ctx, "org.hyperledger.fabric:GetMetadata")
	goutils.PanicError(err)

	goutils.FromJson(bytes, &cm)
	return
}
