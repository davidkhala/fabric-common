package golang

import (
	"crypto/x509"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/goutils/crypto"
	. "github.com/davidkhala/goutils/grpc"
	"github.com/hyperledger/fabric-protos-go-apiv2/msp"
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

	certificate = crypto.ParseCertPemOrPanic(tlsCARootCertBytes)

	var param = Params{
		SslTargetNameOverride: node.SslTargetNameOverride,
		Certificate:           certificate,
		WaitForReady:          true,
	}
	connect, err = Ping(node.Addr, param)
	goutils.PanicError(err)
	return

}
func LoadCryptoFrom(config CryptoConfig) *Crypto {

	priv, err := GetPrivateKey(config.PrivKey)
	goutils.PanicError(err)

	cert, certBytes, err := GetCertificate(config.SignCert)

	goutils.PanicError(err)

	id := &msp.SerializedIdentity{
		Mspid:   config.MSPID,
		IdBytes: certBytes,
	}

	creator, err := proto.Marshal(id)
	goutils.PanicError(err)

	_crypto := &Crypto{
		Creator:     creator,
		PrivKey:     priv,
		SignCert:    cert,
		mspID:       config.MSPID,
		certificate: certBytes,
	}
	_crypto.SetDefaultDigest()
	return _crypto
}
