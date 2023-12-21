package golang

import (
	"crypto/x509"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/goutils/crypto"
	. "github.com/davidkhala/goutils/grpc"
	"github.com/hyperledger/fabric-protos-go-apiv2/msp"
	"github.com/pkg/errors"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
)

func (node Node) AsGRPCClient() (connect *grpc.ClientConn, err error) {

	var certificate *x509.Certificate
	var tlsCARootCertBytes = node.TLSCARootByte
	if tlsCARootCertBytes == nil {
		tlsCARootCertBytes, err = goutils.ReadFile(node.TLSCARoot)
		if err != nil {
			return nil, err
		}
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
	connect, err = Ping(node.Addr, param)
	return

}
func LoadCryptoFrom(config CryptoConfig) (*Crypto, error) {

	priv, err := GetPrivateKey(config.PrivKey)
	if err != nil {
		return nil, errors.Wrapf(err, "error loading priv key")
	}

	cert, certBytes, err := GetCertificate(config.SignCert)
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

	return &Crypto{
		Creator:  name,
		PrivKey:  priv,
		SignCert: cert,
	}, nil
}
