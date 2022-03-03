package golang

import (
	"crypto/x509"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/goutils/crypto"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	"google.golang.org/grpc"
)

type Node struct {
	tape.Node
	SslTargetNameOverride string
}

func (node Node) AsGRPCClient() (connect *grpc.ClientConn, err error) {

	var certificate *x509.Certificate
	var tlsCACertBytes []byte
	tlsCACertBytes, err = goutils.ReadFile(node.TLSCACert)
	if err != nil {
		return nil, err
	}

	certificate = crypto.ParseCertPem(tlsCACertBytes)

	var param = Params{
		SslTargetNameOverride: node.SslTargetNameOverride,
		Certificate:           certificate,
		WaitForReady:          true,
	}
	connect, err = Pings(node.Addr, param)
	return

}
