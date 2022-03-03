package golang

import (
	"crypto/x509"
	"github.com/davidkhala/goutils"
	"github.com/davidkhala/goutils/crypto"
	"testing"
)

func TestConnection(t *testing.T) {
	var Addr = "localhost:8051" // TLSCACert should have a SAN extension
	var TLSCACert = "/home/davidliu/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem"
	var certificate *x509.Certificate
	var tlsCACertBytes []byte
	var err error
	tlsCACertBytes, err = goutils.ReadFile(TLSCACert)
	goutils.PanicError(err)

	certificate = crypto.ParseCertPem(tlsCACertBytes)
	//ParseCertPem(pemBytes []byte) *x509.Certificate

	var param = Params{
		SslTargetNameOverride: "peer0.icdd",
		Certificate:           certificate,
	}
	err = Pings(Addr, param)
	goutils.PanicError(err)

}
