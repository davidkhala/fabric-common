package format

type MessageSigningIdentity interface {
	Sign(message []byte) ([]byte, error)
	MspID() string       // ID of the Membership Service Provider to which this identity belongs.
	Credentials() []byte // Implementation-specific credentials.
	Digest(message []byte) []byte
}
