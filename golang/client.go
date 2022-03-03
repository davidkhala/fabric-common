package golang

import (
	"google.golang.org/grpc"
	"strings"
)

// ToAddress is a utility function to trim the GRPC protocol prefix as it is not needed by GO
// if the GRPC protocol is not found, the url is returned unchanged
func ToAddress(url string) string {
	if strings.HasPrefix(url, "grpc://") {
		return strings.TrimPrefix(url, "grpc://")
	}
	if strings.HasPrefix(url, "grpcs://") {
		return strings.TrimPrefix(url, "grpcs://")
	}
	return url
}

func Pings(target string, params Params) (err error) {
	var opts []grpc.DialOption
	opts, err = DialOptionsFrom(params)
	if err != nil {
		return
	}
	err = Ping(target, opts...)
	return
}
func Ping(target string, opts ...grpc.DialOption) (err error) {
	var connect *grpc.ClientConn

	defer func() { err = connect.Close() }()
	opts = append(opts, grpc.WithBlock()) // To make it a blocking dial, use WithBlock() dial option.
	connect, err = grpc.Dial(ToAddress(target), opts...)
	return
}

//var opts []grpc.DialOption
//...
//conn, err := grpc.Dial(*serverAddr, opts...)
//if err != nil {
//  ...
//}
//defer conn.Close()
