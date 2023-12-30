package discover

import (
	"context"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/discovery"
	"google.golang.org/grpc"
)

type Client struct {
	discovery.DiscoveryClient
	context.Context
	clientTlsCertHash []byte
}

func (c *Client) Init(grpcClient grpc.ClientConnInterface) {
	var client = discovery.NewDiscoveryClient(grpcClient)
	c.DiscoveryClient = client

}
func (c Client) Request(crypto protoutil.Signer, queries ...*discovery.Query) (responses []IsQueryResult) {
	var signedRequest = Request(crypto, c.clientTlsCertHash, queries...)
	discoverResponse, err := c.DiscoveryClient.Discover(c.Context, &signedRequest)
	goutils.PanicError(err)

	for _, result := range discoverResponse.Results {
		var r2 = result.Result
		switch r2.(type) {
		case *discovery.QueryResult_Error:
			responses = append(responses, Error{
				Content: r2.(*discovery.QueryResult_Error).Error.Content,
			})
			break
		case *discovery.QueryResult_ConfigResult:
			r := r2.(*discovery.QueryResult_ConfigResult).ConfigResult

			responses = append(responses, ConfigResult{
				Msps:     r.Msps,
				Orderers: r.Orderers,
			})
			break
		case *discovery.QueryResult_CcQueryRes:
			responses = append(responses, CCQueryRes{
				Content: r2.(*discovery.QueryResult_CcQueryRes).CcQueryRes.Content,
			})
			break
		case *discovery.QueryResult_Members:
			responses = append(responses, Members{
				PeersByOrg: r2.(*discovery.QueryResult_Members).Members.PeersByOrg,
			})
			break
		}
	}
	return
}
