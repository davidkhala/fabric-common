#!/usr/bin/env bash
set -e
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

fcn=$1

systemProfile="/etc/profile"
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

function golang() {
    goTar=go1.9.2.linux-amd64.tar.gz
    if go version >/dev/null;then
        echo ... to overwrite exiting golang at GOROOT: $(go env GOROOT)
        sudo rm -rf $(go env GOROOT)
    fi
	# install golang
	if docker version >/dev/null ;then
        goTar=$(docker version | grep -m1 go| awk '{print($3)}').linux-amd64.tar.gz
        echo ... to use docker inline go version :[${goTar}]
    fi
	wget https://redirector.gvt1.com/edgedl/go/${goTar}
	sudo tar -C /usr/local -xzf ${goTar}
	# write path to 'go' command
	if ! grep "/usr/local/go/bin" $systemProfile; then
		echo "export PATH=\$PATH:/usr/local/go/bin" | sudo tee -a $systemProfile
	fi
	# write path to $GOPATH/bin
	GOPATH=$(go env GOPATH)
	if ! grep "$GOPATH/bin" $systemProfile; then
		echo "export PATH=\$PATH:$GOPATH/bin" | sudo tee -a $systemProfile
	fi
	# delete install pack
	rm -f ${goTar}
}
function golang-uninstall() {
	:
	#    TODO  To remove an existing Go installation from your system delete the go directory. This is usually /usr/local/go under Linux, Mac OS X, and FreeBSD or c:\Go under Windows.
	# You should also remove the Go bin directory from your PATH environment variable. Under Linux and FreeBSD you should edit /etc/profile or $HOME/.profile. If you installed Go with the Mac OS X package then you should remove the /etc/paths.d/go file. Windows users should read the section about setting environment variables under Windows.
}
function govendor(){
    go get -u github.com/kardianos/govendor
    cp $(go env GOPATH)/bin/govendor $CURRENT/bin
}
function cn(){
  	$CURRENT/docker/install.sh cn
  	$CURRENT/docker/nodejs/install.sh cn
}
if [ -n "$fcn" ]; then
	$fcn $remain_params
else
	$CURRENT/docker/install.sh
	$CURRENT/docker/nodejs/install.sh
fi
