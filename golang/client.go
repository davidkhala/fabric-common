package golang

import (
	"github.com/davidkhala/goutils"
	. "github.com/davidkhala/goutils/grpc"
	"google.golang.org/grpc"
	"io/ioutil"
	"path"
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

func Pings(target string, params Params) (connect *grpc.ClientConn, err error) {
	var opts []grpc.DialOption
	opts, err = DialOptionsFrom(params)
	if err != nil {
		return
	}
	connect, err = Ping(target, opts...)
	return
}

func Ping(target string, opts ...grpc.DialOption) (connect *grpc.ClientConn, err error) {

	connect, err = grpc.Dial(ToAddress(target), opts...)
	return
}

func FindKeyFilesOrPanic(dirname string) []string {
	fileInfos, err := ioutil.ReadDir(dirname)
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
