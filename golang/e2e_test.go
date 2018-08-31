package golang

import (
	"testing"
	"github.com/hyperledger/fabric-sdk-go/test/integration/e2e"
	SDKConfig "github.com/hyperledger/fabric-sdk-go/pkg/core/config"
)

const (
	configPath = "/home/david/go/src/github.com/davidkhala/delphi-fabric/common/golang/config/client.yaml"
)

func TestE2E(t *testing.T) {
	var config = SDKConfig.FromFile(configPath)
	e2e.Run(t, config)
}
