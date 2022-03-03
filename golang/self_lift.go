package golang

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/keepalive"
)

const (
	// GRPC max message size (same as Fabric)
	maxCallRecvMsgSize = 100 * 1024 * 1024
	maxCallSendMsgSize = 100 * 1024 * 1024
)

type Params struct {
	SslTargetNameOverride string            // "ssl-target-name-override"
	Certificate           *x509.Certificate // tlscacert
	ClientCertificate     *tls.Certificate  // for mutual tls
	KeepAliveParams       *keepalive.ClientParameters
	WaitForReady          bool
}

// TLSConfigFrom returns the appropriate config for TLS including the root CAs, certs for mutual TLS, and server host override.
func TLSConfigFrom(clientTLSCert *tls.Certificate, serverName string, rootCAs ...*x509.Certificate) (*tls.Config, error) {
	var err error
	var certPool *x509.CertPool
	var clientCertificates []tls.Certificate
	certPool, err = x509.SystemCertPool()
	if err != nil {
		return nil, err
	}
	for _, rootCA := range rootCAs {
		certPool.AddCert(rootCA)
	}

	if clientTLSCert != nil {
		clientCertificates = append(clientCertificates, *clientTLSCert)
	}
	return &tls.Config{RootCAs: certPool, Certificates: clientCertificates, ServerName: serverName}, nil
}
func DialOptionsFrom(params Params) ([]grpc.DialOption, error) {
	var dialOpts []grpc.DialOption

	if params.KeepAliveParams != nil {
		dialOpts = append(dialOpts, grpc.WithKeepaliveParams(*params.KeepAliveParams))
	}

	dialOpts = append(dialOpts, grpc.WithDefaultCallOptions(grpc.WaitForReady(params.WaitForReady)))

	if params.Certificate != nil {
		tlsConfig, err := TLSConfigFrom(params.ClientCertificate, params.SslTargetNameOverride, params.Certificate)
		if err != nil {
			return nil, err
		}

		dialOpts = append(dialOpts, grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)))
	} else {
		dialOpts = append(dialOpts, grpc.WithInsecure())
	}

	dialOpts = append(dialOpts, grpc.WithDefaultCallOptions(
		grpc.MaxCallRecvMsgSize(maxCallRecvMsgSize),
		grpc.MaxCallSendMsgSize(maxCallSendMsgSize),
	))

	return dialOpts, nil
}

// GetGoContext used by the initialization
func GetGoContext() context.Context {
	return context.Background()
}
