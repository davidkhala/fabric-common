package golang

import (
	"github.com/davidkhala/goutils"
	. "github.com/davidkhala/goutils/grpc"
	"google.golang.org/grpc"
	"os"
	"path"
	"strings"
)

// ToAddress is a utility function to trim the GRPC protocol prefix as it is not needed by GO
//
//	If the GRPC protocol is not found, the url is returned unchanged
func ToAddress(url string) string {
	if strings.HasPrefix(url, "grpc://") {
		return strings.TrimPrefix(url, "grpc://")
	}
	if strings.HasPrefix(url, "grpcs://") {
		return strings.TrimPrefix(url, "grpcs://")
	}
	return url
}

func Ping(target string, params Params) (connect *grpc.ClientConn, err error) {
	var opts []grpc.DialOption
	opts, err = DialOptionsFrom(params)
	if err != nil {
		return
	}
	connect, err = grpc.Dial(ToAddress(target), opts...)
	return
}
func PingOrPanic(target string, params Params) *grpc.ClientConn {
	connect, err := Ping(target, params)
	goutils.PanicError(err)
	return connect
}

func FindKeyFilesOrPanic(dirname string) []string {
	fileInfos, err := os.ReadDir(dirname)
	goutils.PanicError(err)
	var result []string
	for _, fileInfo := range fileInfos {
		var basename = fileInfo.Name()
		if strings.HasSuffix(basename, "_sk") {
			result = append(result, path.Join(dirname, basename))
		}
	}
	return result
}
