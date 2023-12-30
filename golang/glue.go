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

func (node Node) AsGRPCClient() (connect *grpc.ClientConn) {
	var err error
	var certificate *x509.Certificate
	var tlsCARootCertBytes = node.TLSCARootByte
	if tlsCARootCertBytes == nil {
		tlsCARootCertBytes, err = goutils.ReadFile(node.TLSCARoot)
		goutils.PanicError(err)
	}

	certificate, err = crypto.ParseCertPem(tlsCARootCertBytes)
	goutils.PanicError(err)

	var param = Params{
		SslTargetNameOverride: node.SslTargetNameOverride,
		Certificate:           certificate,
		WaitForReady:          true,
	}
	connect, err = Ping(node.Addr, param)
	goutils.PanicError(err)
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

	idBytes, err := proto.Marshal(id)
	if err != nil {
		return nil, errors.Wrapf(err, "error get msp id")
	}

	_crypto := &Crypto{
		Creator:  idBytes,
		PrivKey:  priv,
		SignCert: cert,
	}
	_crypto.SetDefaultDigest()
	return _crypto, nil
}
