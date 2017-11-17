#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

fcn=$1

systemProfile="/etc/profile"
goTar=go1.7.6.linux-amd64.tar.gz
function golang() {
	# install golang
	wget https://redirector.gvt1.com/edgedl/go/${goTar}
	tar -C /usr/local -xzf ${goTar}
	# write path ( not go path )
	if ! grep "/usr/local/go/bin" $systemProfile; then
		echo "export PATH=\$PATH:/usr/local/go/bin" | sudo tee -a $systemProfile
	fi
	# delete install pack
	rm -f ${goTar}
}
function golang-uninstall() {
	:
	#    TODO  To remove an existing Go installation from your system delete the go directory. This is usually /usr/local/go under Linux, Mac OS X, and FreeBSD or c:\Go under Windows.
	# You should also remove the Go bin directory from your PATH environment variable. Under Linux and FreeBSD you should edit /etc/profile or $HOME/.profile. If you installed Go with the Mac OS X package then you should remove the /etc/paths.d/go file. Windows users should read the section about setting environment variables under Windows.
}
if [ -n "$fcn" ]; then
	$fcn
else
	$CURRENT/docker/install.sh
	$CURRENT/docker/nodejs/install.sh
fi
