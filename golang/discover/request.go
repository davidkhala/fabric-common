package discover

import (
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/protoutil"
	"github.com/hyperledger/fabric-protos-go-apiv2/discovery"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
)

func ConfigQuery(channel string) discovery.Query {
	return discovery.Query{
		Channel: channel,
		Query: &discovery.Query_ConfigQuery{
			ConfigQuery: &discovery.ConfigQuery{},
		},
	}
}

// PeerMembershipQuery The filter field: filter according to chaincodes that are installed on peers and collection access control policies.
func PeerMembershipQuery(channel string, filter *peer.ChaincodeInterest) discovery.Query {
	return discovery.Query{
		Channel: channel,
		Query: &discovery.Query_PeerQuery{PeerQuery: &discovery.PeerMembershipQuery{
			Filter: filter,
		}},
	}
}

// LocalPeerQuery queries for peers in a non channel context,
func LocalPeerQuery() discovery.Query {
	return discovery.Query{
		Query: &discovery.Query_LocalPeers{LocalPeers: &discovery.LocalPeerQuery{}},
	}
}

func ChaincodeQuery(chanel string, interests ...*peer.ChaincodeInterest) discovery.Query {
	if len(interests) == 0 {
		// panic "chaincode query must have at least one chaincode interest"
		var interest1 = &peer.ChaincodeInterest{
			Chaincodes: []*peer.ChaincodeCall{
				{
					Name: "_lifecycle",
				},
			},
		}

		interests = append(interests, interest1)
	}
	return discovery.Query{
		Channel: chanel,
		Query:   &discovery.Query_CcQuery{CcQuery: &discovery.ChaincodeQuery{Interests: interests}},
	}
}
func Request(crypto protoutil.Signer, clientTlsCertHash []byte, queries ...*discovery.Query) discovery.SignedRequest {
	idBytes, err := crypto.Serialize()
	goutils.PanicError(err)
	var authInfo = discovery.AuthInfo{
		ClientIdentity:    idBytes,
		ClientTlsCertHash: clientTlsCertHash,
	}
	var request = discovery.Request{
		Authentication: &authInfo,
		Queries:        queries,
	}

	var requestBytes = protoutil.MarshalOrPanic(&request)
	signature, err := crypto.Sign(requestBytes)
	goutils.PanicError(err)
	return discovery.SignedRequest{
		Payload:   requestBytes,
		Signature: signature,
	}
}
