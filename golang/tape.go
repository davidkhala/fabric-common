// tape.go is utils copied from tape project
package golang

import (
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"github.com/pkg/errors"
	"io/ioutil"
)

type Node struct {
	Addr                  string `yaml:"addr"`
	TLSCACert             string `yaml:"tls_ca_cert"`
	TLSCAKey              string `yaml:"tls_ca_key"`
	TLSCARoot             string `yaml:"tls_ca_root"`
	TLSCACertByte         []byte
	TLSCAKeyByte          []byte
	TLSCARootByte         []byte
	SslTargetNameOverride string `json:"ssl-target-name-override"`
}

// DERToPrivateKey unmarshals a der to private key
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

// PEMtoPrivateKey unmarshals a pem to private key
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
	in, err := ioutil.ReadFile(f)
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
}
type Crypto struct {
	Creator  []byte
	PrivKey  *ecdsa.PrivateKey
	SignCert *x509.Certificate
}

func GetCertificate(f string) (*x509.Certificate, []byte, error) {
	in, err := ioutil.ReadFile(f)
	if err != nil {
		return nil, nil, err
	}

	block, _ := pem.Decode(in)

	c, err := x509.ParseCertificate(block.Bytes)
	return c, in, err
}
