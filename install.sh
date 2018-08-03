#!/usr/bin/env bash
set -e
CURRENT=$(
	cd $(dirname ${BASH_SOURCE})
	pwd
)

fcn=$1

this_uname=$(uname)
bashProfile="$HOME/.bashrc"
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

function golangBinaryRemove() {
	local goVersion=$1
	local purge=$2
	if ! go version; then
		echo go not found, skip remove
		return
	fi
	GOROOT=$(go env GOROOT)
	if ! go version | grep $goVersion; then
		echo current go version=$(go verion), not $goVersion, skip remove
		return
	fi
	echo remove golang $goVersion

	sudo sed -i "\|${GOROOT}|d" $bashProfile
	if [ -n "$purge" ]; then
		GOPATH=$(go env GOPATH)
		echo ...and PURGE, GOPATH:$GOPATH is nuke!!!
		sudo sed -i "\|${GOPATH}|d" $bashProfile
		sudo rm -rf $GOPATH
	fi
	sudo rm -rf $GOROOT
	source $bashProfile
}

function golang1_9Remove() {
	local goVersion=go1.9.2
	local purge=$1
	if ! go version; then
		echo go not found, skip remove
		return
	fi
	GOROOT=$(go env GOROOT)
	if ! go version | grep $goVersion; then
		echo current go version=$(go verion), not $goVersion, skip remove
		return
	fi
	echo remove golang $goVersion

	sudo sed -i "\|${GOROOT}|d" $bashProfile
	if [ -n "$purge" ]; then
		GOPATH=$(go env GOPATH)
		echo ...and PURGE, GOPATH:$GOPATH is nuke!!!
		sudo sed -i "\|${GOPATH}|d" $bashProfile
		sudo rm -rf $GOPATH
	fi
	sudo rm -rf $GOROOT
	source $bashProfile
}
function golang1_9() {
	local goVersion=go1.9.2

	echo install golang $goVersion
	goTar=$goVersion.linux-amd64.tar.gz

	if go version; then
		if go version | grep $goVersion; then
			echo go version $goVersion exist, skip install
			return
		fi
		echo ... to overwrite exiting go at version $(go version)
		golangBinaryRemove $(go version)
	fi

	wget https://redirector.gvt1.com/edgedl/go/${goTar}
	sudo tar -C /usr/local -xzf ${goTar}
	rm -f ${goTar}

	# write path to 'go' command
	if ! echo $PATH | grep "/usr/local/go/bin" >/dev/null ; then
		echo "export PATH=\$PATH:/usr/local/go/bin" | sudo tee -a $bashProfile
	fi

	# write path to $GOPATH/bin
	GOPATH=$(go env GOPATH)
	if ! echo $PATH | grep "$GOPATH/bin" >/dev/null ; then
		echo "export PATH=\$PATH:$GOPATH/bin" | sudo tee -a $bashProfile
	fi
	source $bashProfile
}
function golang1_7() {
	goVersion=go1.7.6
	GOPATH=$HOME/go
	if [ "$1" == "remove" ]; then
		echo remove golang $goVersion
		sudo sed -i '/\/usr\/local\/go\/bin/d' $bashProfile
		sudo sed -i "/${GOPATH}/d" $bashProfile
		sudo rm -rf /usr/local/go
		return
	fi

	echo install golang $goVersion
	goTar=$goVersion.linux-amd64.tar.gz
	# write path to 'go' command
	if ! grep "/usr/local/go/bin" $bashProfile; then
		echo "export PATH=\$PATH:/usr/local/go/bin" | sudo tee -a $bashProfile
		export PATH=$PATH:/usr/local/go/bin
	fi

	if ! go version | grep $goVersion; then
		if go version; then
			echo ... to overwrite exiting golang at GOROOT: $(go env GOROOT)
			sudo rm -rf $(go env GOROOT)
		fi
		wget https://redirector.gvt1.com/edgedl/go/${goTar}
		sudo tar -C /usr/local -xzf ${goTar}
		rm -f ${goTar}
	fi

	# write path to $GOPATH/bin
	if ! grep "$GOPATH/bin" $bashProfile; then
		echo "export PATH=\$PATH:$GOPATH/bin" | sudo tee -a $bashProfile
		export PATH=$PATH:$GOPATH/bin
	fi
	# write GOPATH
	if ! grep "$GOPATH" $bashProfile; then
		echo "export GOPATH=${GOPATH}" | sudo tee -a $bashProfile
		export GOPATH=$GOPATH
	fi
	echo go intall done, restart is required
}
function golang1_10() {
	if [ "$1" == "remove" ]; then
		sudo apt-get -y remove golang-go
		sudo add-apt-repository --remove -y ppa:longsleep/golang-backports
	else
		sudo add-apt-repository -y ppa:longsleep/golang-backports
		sudo apt-get update
		sudo apt-get -y install golang-go
	fi
}
function install_libtool() {
	if [ "${this_uname}" == "Darwin" ]; then
		brew install libtool
	else
		sudo apt-get install -y libtool
	fi

}

function golang_dep() {
	curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
	dep version
}
function gitSync() {
	git pull
	git submodule update --init --recursive
}

function chaincodeDevEnv() {
	golang1_10
	install_libtool
	golang_dep
}
if [ -n "$fcn" ]; then
	$fcn $remain_params
else
	if [ "${this_uname}" == "Darwin" ]; then
		:
	else
		# FIXME allow for new version without plugin support
		set +e
		sudo apt-get install -y linux-image-extra-$(uname -r)
		set -e
		sudo apt-get install -y linux-image-extra-virtual
		sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
	fi

	$CURRENT/docker/install.sh
	$CURRENT/docker/nodejs/install.sh
	cd $CURRENT/nodejs
	npm install
	cd -
	cd $CURRENT/docker/nodejs
	npm install
	cd -
fi
