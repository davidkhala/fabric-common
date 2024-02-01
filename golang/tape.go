// TODO tape.go was utils copied from tape project, now we can write our own powered by goutil
package golang

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/asn1"
	"encoding/pem"
	"fmt"
	"github.com/davidkhala/goutils"
	util_crypto "github.com/davidkhala/goutils/crypto"
	"github.com/davidkhala/protoutil/common/crypto"
	"github.com/hyperledger/fabric-gateway/pkg/hash"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/pkg/errors"
	"math/big"
	"os"
)

type Node struct {
	Addr                  string
	TLSCACert             string
	TLSCAKey              string
	TLSCARoot             string
	TLSCACertByte         []byte
	TLSCAKeyByte          []byte
	TLSCARootByte         []byte
	SslTargetNameOverride string `json:"ssl-target-name-override"`
}

// DERToPrivateKey unmarshal a der to private key
func DERToPrivateKey(der []byte) (key interface{}, err error) {

	if key, err = x509.ParsePKCS1PrivateKey(der); err == nil {
		return key, nil
	}

	if key, err = x509.ParsePKCS8PrivateKey(der); err == nil {
		switch key.(type) {
		case *ecdsa.PrivateKey:
			return
		default:
			return nil, errors.New("Found unknown private key type in PKCS#8 wrapping")
		}
	}

	if key, err = x509.ParseECPrivateKey(der); err == nil {
		return
	}

	return nil, errors.New("Invalid key type. The DER must contain an ecdsa.PrivateKey")
}

// PEMtoPrivateKey unmarshal a pem to private key
func PEMtoPrivateKey(raw []byte, pwd []byte) (interface{}, error) {
	if len(raw) == 0 {
		return nil, errors.New("Invalid PEM. It must be different from nil.")
	}
	block, _ := pem.Decode(raw)
	if block == nil {
		return nil, fmt.Errorf("Failed decoding PEM. Block must be different from nil. [% x]", raw)
	}

	// TODO: derive from header the type of the key

	if x509.IsEncryptedPEMBlock(block) {
		if len(pwd) == 0 {
			return nil, errors.New("Encrypted Key. Need a password")
		}

		decrypted, err := x509.DecryptPEMBlock(block, pwd)
		if err != nil {
			return nil, fmt.Errorf("Failed PEM decryption [%s]", err)
		}

		key, err := DERToPrivateKey(decrypted)
		if err != nil {
			return nil, err
		}
		return key, err
	}

	cert, err := DERToPrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	return cert, err
}
func GetPrivateKey(f string) (*ecdsa.PrivateKey, error) {
	in, err := os.ReadFile(f)
	if err != nil {
		return nil, err
	}

	k, err := PEMtoPrivateKey(in, []byte{})
	if err != nil {
		return nil, err
	}

	key, ok := k.(*ecdsa.PrivateKey)
	if !ok {
		return nil, errors.Errorf("expecting ecdsa key")
	}

	return key, nil
}

type CryptoConfig struct {
	MSPID      string
	PrivKey    string
	SignCert   string
	TLSCACerts []string
	//	TODO to cater ClientTlsCertHash
}

func (c CryptoConfig) GetCertificate() (*x509.Certificate, []byte) {
	in, err := os.ReadFile(c.SignCert)
	goutils.PanicError(err)

	return util_crypto.ParseCertPemOrPanic(in), in
}

type Crypto struct {
	Creator       []byte
	PrivKey       *ecdsa.PrivateKey
	SignCert      *x509.Certificate
	digest        hash.Hash
	mspID         string // cached as part of Creator
	certificate   []byte // cached as part of Creator
	gatewayDigest hash.Hash
}

func (c *Crypto) Digest(message []byte) []byte {
	if c.gatewayDigest != nil {
		return c.gatewayDigest(message)
	}
	return c.digest(message)
}

func (c *Crypto) MspID() string       { return c.mspID }
func (c *Crypto) Credentials() []byte { return c.certificate }

func (c *Crypto) DefaultMode() {
	c.digest = hash.SHA256
	c.gatewayDigest = nil
}
func (c *Crypto) GatewayMode() {
	c.digest = hash.NONE
	c.gatewayDigest = hash.SHA256
}

func (c *Crypto) SetDigest(digestFunc hash.Hash) {
	c.digest = digestFunc
}

func (c *Crypto) Sign(message []byte) ([]byte, error) {
	ri, si, err := ecdsa.Sign(rand.Reader, c.PrivKey, c.digest(message))
	if err != nil {
		return nil, err
	}

	si, _, err = ToLowS(&c.PrivKey.PublicKey, si)
	if err != nil {
		return nil, err
	}

	return asn1.Marshal(ECDSASignature{ri, si})
}
func (c *Crypto) Serialize() ([]byte, error) {
	return c.Creator, nil
}

func (c *Crypto) NewSignatureHeader() (*common.SignatureHeader, error) {
	creator, err := c.Serialize()
	if err != nil {
		return nil, err
	}
	nonce, err := crypto.GetRandomNonce()
	if err != nil {
		return nil, err
	}

	return &common.SignatureHeader{
		Creator: creator,
		Nonce:   nonce,
	}, nil
}

type ECDSASignature struct {
	R, S *big.Int
}

var (
	// CurveHalfOrders contains the precomputed curve group orders halved.
	// It is used to ensure that signature' S value is lower or equal to the
	// curve group order halved. We accept only low-S signatures.
	// They are precomputed for efficiency reasons.
	CurveHalfOrders = map[elliptic.Curve]*big.Int{
		elliptic.P224(): new(big.Int).Rsh(elliptic.P224().Params().N, 1),
		elliptic.P256(): new(big.Int).Rsh(elliptic.P256().Params().N, 1),
		elliptic.P384(): new(big.Int).Rsh(elliptic.P384().Params().N, 1),
		elliptic.P521(): new(big.Int).Rsh(elliptic.P521().Params().N, 1),
	}
)

func IsLowS(k *ecdsa.PublicKey, s *big.Int) (bool, error) {
	halfOrder, ok := CurveHalfOrders[k.Curve]
	if !ok {
		return false, fmt.Errorf("curve not recognized [%s]", k.Curve)
	}

	return s.Cmp(halfOrder) != 1, nil
}

func ToLowS(k *ecdsa.PublicKey, s *big.Int) (*big.Int, bool, error) {
	lowS, err := IsLowS(k, s)
	if err != nil {
		return nil, false, err
	}

	if !lowS {
		// Set s to N - s that will be then in the lower part of signature space
		// less or equal to half order
		s.Sub(k.Params().N, s)

		return s, true, nil
	}

	return s, false, nil
}
