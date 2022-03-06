package golang

import (
	"crypto/x509"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/goutils/crypto"
	. "github.com/davidkhala/goutils/grpc"
	"github.com/golang/protobuf/proto"
	tape "github.com/hyperledger-twgc/tape/pkg/infra"
	"github.com/hyperledger/fabric-protos-go/msp"
	"github.com/pkg/errors"
	"google.golang.org/grpc"
)

type Node struct {
	tape.Node
	SslTargetNameOverride string `json:"ssl-target-name-override"`
}

func (node Node) AsGRPCClient() (connect *grpc.ClientConn, err error) {

	var certificate *x509.Certificate
	var tlsCARootCertBytes []byte
	tlsCARootCertBytes, err = goutils.ReadFile(node.TLSCARoot)
	if err != nil {
		return nil, err
	}

	certificate, err = crypto.ParseCertPem(tlsCARootCertBytes)
	if err != nil {
		return nil, err
	}

	var param = Params{
		SslTargetNameOverride: node.SslTargetNameOverride,
		Certificate:           certificate,
		WaitForReady:          true,
	}
	connect, err = Pings(node.Addr, param)
	return

}
func LoadCryptoFrom(config tape.CryptoConfig) (*tape.Crypto, error) {

	priv, err := tape.GetPrivateKey(config.PrivKey)
	if err != nil {
		return nil, errors.Wrapf(err, "error loading priv key")
	}

	cert, certBytes, err := tape.GetCertificate(config.SignCert)
	if err != nil {
		return nil, errors.Wrapf(err, "error loading certificate")
	}

	id := &msp.SerializedIdentity{
		Mspid:   config.MSPID,
		IdBytes: certBytes,
	}

	name, err := proto.Marshal(id)
	if err != nil {
		return nil, errors.Wrapf(err, "error get msp id")
	}

	return &tape.Crypto{
		Creator:  name,
		PrivKey:  priv,
		SignCert: cert,
	}, nil
}
