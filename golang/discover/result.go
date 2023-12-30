package discover

import (
	"fmt"
	"github.com/davidkhala/goutils"
	"github.com/hyperledger/fabric-protos-go-apiv2/discovery"
	"github.com/hyperledger/fabric-protos-go-apiv2/gossip"
	"github.com/hyperledger/fabric-protos-go-apiv2/msp"
	"google.golang.org/protobuf/proto"
)

type IsQueryResult interface {
}

type Error struct {
	IsQueryResult
	Content string
}

func (e Error) Error() string {
	return e.Content
}

type ConfigResult struct {
	IsQueryResult
	// msps is a map from MSP_ID to FabricMSPConfig
	Msps map[string]*msp.FabricMSPConfig
	// orderers is a map from MSP_ID to endpoint lists of orderers
	Orderers map[string]*discovery.Endpoints
}

type FabricMSPConfig struct {

	// List of root certificates trusted by this MSP
	// they are used upon certificate validation (see
	// comment for IntermediateCerts below)
	RootCerts [][]byte `protobuf:"bytes,2,rep,name=root_certs,json=rootCerts,proto3" json:"root_certs,omitempty"`
	// List of intermediate certificates trusted by this MSP;
	// they are used upon certificate validation as follows:
	// validation attempts to build a path from the certificate
	// to be validated (which is at one end of the path) and
	// one of the certs in the RootCerts field (which is at
	// the other end of the path). If the path is longer than
	// 2, certificates in the middle are searched within the
	// IntermediateCerts pool
	IntermediateCerts [][]byte `protobuf:"bytes,3,rep,name=intermediate_certs,json=intermediateCerts,proto3" json:"intermediate_certs,omitempty"`
	// Identity denoting the administrator of this MSP
	Admins [][]byte `protobuf:"bytes,4,rep,name=admins,proto3" json:"admins,omitempty"`
	// Identity revocation list
	RevocationList [][]byte `protobuf:"bytes,5,rep,name=revocation_list,json=revocationList,proto3" json:"revocation_list,omitempty"`
	// OrganizationalUnitIdentifiers holds one or more
	// fabric organizational unit identifiers that belong to
	// this MSP configuration
	OrganizationalUnitIdentifiers []*msp.FabricOUIdentifier `protobuf:"bytes,7,rep,name=organizational_unit_identifiers,json=organizationalUnitIdentifiers,proto3" json:"organizational_unit_identifiers,omitempty"`
	// FabricCryptoConfig contains the configuration parameters
	// for the cryptographic algorithms used by this MSP
	CryptoConfig *msp.FabricCryptoConfig `protobuf:"bytes,8,opt,name=crypto_config,json=cryptoConfig,proto3" json:"crypto_config,omitempty"`
	// List of TLS root certificates trusted by this MSP.
	// They are returned by GetTLSRootCerts.
	TlsRootCerts [][]byte `protobuf:"bytes,9,rep,name=tls_root_certs,json=tlsRootCerts,proto3" json:"tls_root_certs,omitempty"`
	// List of TLS intermediate certificates trusted by this MSP;
	// They are returned by GetTLSIntermediateCerts.
	TlsIntermediateCerts [][]byte `protobuf:"bytes,10,rep,name=tls_intermediate_certs,json=tlsIntermediateCerts,proto3" json:"tls_intermediate_certs,omitempty"`
}

func (c ConfigResult) GetMSPs() map[string]FabricMSPConfig {

	var result = map[string]FabricMSPConfig{}
	for mspId, value := range c.Msps {

		if mspId != value.Name {
			panic(fmt.Sprint("assert: mspid should be equals"))
		}
		if value.FabricNodeOus != nil {
			panic(fmt.Sprint("assert: FabricNodeOus in ConfigResult should be nil"))
		}
		if value.SigningIdentity != nil {
			panic(fmt.Sprint("assert: SigningIdentity in ConfigResult should be nil"))
		}
		result[mspId] = FabricMSPConfig{
			RootCerts:                     value.RootCerts,
			IntermediateCerts:             value.IntermediateCerts,
			Admins:                        value.Admins,
			RevocationList:                value.RevocationList,
			OrganizationalUnitIdentifiers: value.OrganizationalUnitIdentifiers,
			CryptoConfig:                  value.CryptoConfig,
			TlsRootCerts:                  value.TlsRootCerts,
			TlsIntermediateCerts:          value.TlsIntermediateCerts,
		}
	}
	return result

}

type CCQueryRes struct {
	IsQueryResult
	Content []*discovery.EndorsementDescriptor
}

type Members struct {
	IsQueryResult
	PeersByOrg map[string]*discovery.Peers
}
type Peer struct {
	StateInfo      StateInfo
	MembershipInfo AliveMessage
	// This is the msp.SerializedIdentity of the peer, represented in bytes.
	Identity []byte
}

type StateInfo struct {
	Timestamp *gossip.PeerTime
	PkiId     []byte
	// channel_MAC is an authentication code that proves that the peer that sent this message knows the name of the channel.

	Channel_MAC  []byte
	LedgerHeight uint64
	LeftChannel  bool
	Chaincodes   []*gossip.Chaincode
}
type AliveMessage struct {
	Endpoint string
	PkiId    []byte

	Timestamp *gossip.PeerTime `protobuf:"bytes,2,opt,name=timestamp,proto3" json:"timestamp,omitempty"`
}

func (p *Peer) Init(raw *discovery.Peer, fromLocalPeer bool) {
	p.Identity = raw.Identity

	var placeHolder = &gossip.GossipMessage{}
	if fromLocalPeer {
		goutils.AssertNil(raw.StateInfo, "result of LocalPeerQuery has nil StateInfo")
	} else {

		var err = proto.Unmarshal(raw.StateInfo.Payload, placeHolder)
		goutils.PanicError(err)
		var rawStateInfo = placeHolder.Content.(*gossip.GossipMessage_StateInfo).StateInfo
		p.StateInfo = StateInfo{
			Timestamp:    rawStateInfo.Timestamp,
			PkiId:        rawStateInfo.PkiId,
			Channel_MAC:  rawStateInfo.Channel_MAC,
			LedgerHeight: rawStateInfo.Properties.LedgerHeight,
			LeftChannel:  rawStateInfo.Properties.LeftChannel,
			Chaincodes:   rawStateInfo.Properties.Chaincodes,
		}
	}

	err := proto.Unmarshal(raw.MembershipInfo.Payload, placeHolder)
	goutils.PanicError(err)
	var rawAliveMsg = placeHolder.Content.(*gossip.GossipMessage_AliveMsg).AliveMsg
	p.MembershipInfo = AliveMessage{
		Endpoint:  rawAliveMsg.Membership.Endpoint,
		PkiId:     rawAliveMsg.Membership.PkiId,
		Timestamp: rawAliveMsg.Timestamp,
	}

}

func (m Members) GetPeersByOrg(fromLocalPeer bool) map[string][]Peer {
	var result = make(map[string][]Peer)
	for mspId, value := range m.PeersByOrg {
		var peers []Peer
		for _, peer := range value.Peers {
			var newPeer = Peer{}
			newPeer.Init(peer, fromLocalPeer)
			peers = append(peers, newPeer)
		}
		result[mspId] = peers
	}
	return result
}
