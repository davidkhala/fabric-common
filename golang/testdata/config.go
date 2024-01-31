package testdata

import "github.com/davidkhala/goutils"
import "github.com/davidkhala/fabric-common/golang"

var Peer0Icdd = golang.Node{
	Addr:      "localhost:8051",
	TLSCARoot: goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/tlsca/tlsca.icdd-cert.pem"),

	SslTargetNameOverride: "peer0.icdd",
}
var CryptoconfigAstri = golang.CryptoConfig{
	MSPID:    "astriMSP",
	PrivKey:  golang.FindKeyFilesOrPanic(goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/keystore"))[0],
	SignCert: goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/users/Admin@astri.org/msp/signcerts/Admin@astri.org-cert.pem"),
}
var CryptoconfigIcdd = golang.CryptoConfig{
	MSPID:    "icddMSP",
	PrivKey:  golang.FindKeyFilesOrPanic(goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/users/Admin@icdd/msp/keystore"))[0],
	SignCert: goutils.HomeResolve("delphi-fabric/config/ca-crypto-config/peerOrganizations/icdd/users/Admin@icdd/msp/signcerts/Admin@icdd-cert.pem"),
}
var Channel = "allchannel"
