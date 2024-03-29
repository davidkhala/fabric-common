package golang

import (
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/goutils/crypto"
	. "github.com/davidkhala/goutils/grpc"
	"github.com/davidkhala/goutils/http"
	"github.com/hyperledger/fabric-protos-go-apiv2/msp"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
)

func (node Node) AsGRPCClient() (*grpc.ClientConn, *http.Error) {
	var err error
	var tlsCARootCertBytes = node.TLSCARootByte
	if tlsCARootCertBytes == nil {
		tlsCARootCertBytes, err = goutils.ReadFile(node.TLSCARoot)

		if err != nil {
			return nil, http.BadRequest(err.Error())
		}
	}

	certificate, err := crypto.ParseCertPem(tlsCARootCertBytes)
	if err != nil {
		return nil, http.BadRequest(err.Error())
	}

	var param = Params{
		SslTargetNameOverride: node.SslTargetNameOverride,
		Certificate:           certificate,
		WaitForReady:          true,
	}
	connect, err := Ping(node.Addr, param)
	if err != nil {
		return nil, http.ServiceUnavailable(err.Error())
	}
	return connect, nil
}
func (node Node) AsGRPCClientOrPanic() *grpc.ClientConn {
	connect, err := node.AsGRPCClient()
	if err != nil {
		panic(err)
	}

	return connect
}
func LoadCryptoFrom(config CryptoConfig) *Crypto {

	priv, err := GetPrivateKey(config.PrivKey)
	goutils.PanicError(err)

	cert, certBytes := config.GetCertificate()

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
	_crypto.DefaultMode()
	return _crypto
}
