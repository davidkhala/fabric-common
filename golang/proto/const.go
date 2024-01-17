package proto

import "github.com/hyperledger/fabric-protos-go-apiv2/peer"

const (
	LifecycleName                = "_lifecycle"
	ApproveFuncName              = "ApproveChaincodeDefinitionForMyOrg"
	CommitFuncName               = "CommitChaincodeDefinition"
	CheckCommitReadinessFuncName = "CheckCommitReadiness"
)

type ChaincodeDefinition interface {
	GetSequence() int64
	GetVersion() string
	GetEndorsementPlugin() string
	GetValidationPlugin() string
	GetValidationParameter() []byte
	GetCollections() *peer.CollectionConfigPackage
	GetInitRequired() bool
}
