package testdata

import (
	"context"
	"github.com/davidkhala/fabric-common/golang"
	"github.com/davidkhala/goutils"
	"github.com/kortschak/utter"
	"github.com/stretchr/testify/assert"
	"slices"
	"testing"
)

func TestCryptoMaterial(t *testing.T) {
	golang.LoadCryptoFrom(CryptoconfigAstri)
	golang.LoadCryptoFrom(CryptoconfigIcdd)
}
func TestConnection(t *testing.T) {
	Peer0Icdd.AsGRPCClient()
	println(string(goutils.ToJson(Peer0Icdd)))
}

func TestQuery(t *testing.T) {
	var _cryptoICDD = golang.LoadCryptoFrom(CryptoconfigIcdd)
	var _cryptoASTRI = golang.LoadCryptoFrom(CryptoconfigAstri)
	var ctx = context.Background()
	t.Run("ListChannelOnPeer", func(t *testing.T) {
		var channels = golang.ListChannelOnPeer(ctx, Peer0Icdd.AsGRPCClient(), _cryptoICDD)
		assert.True(t, slices.Contains(channels, Channel))
	})
	t.Run("GetContractMetadata", func(t *testing.T) {
		_cryptoASTRI.GatewayMode()
		var cm = golang.GetContractMetadata(ctx, Peer0Icdd.AsGRPCClient(), _cryptoASTRI, Channel, "contracts")
		_cryptoASTRI.DefaultMode()

		for _, tx := range cm.Contracts["SmartContract"].Transactions {
			println(string(goutils.ToJson(tx)))
		}

	})
}
func TestFindKeyFilesOrPanic(t *testing.T) {
	var dirname = goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore/")
	utter.Dump(golang.FindKeyFilesOrPanic(dirname))
}
