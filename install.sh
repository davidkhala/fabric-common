#!/usr/bin/env bash
set -e
CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)

fcn=$1

bashProfile="$HOME/.bashrc"
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

function golang() {
	if [[ "$1" == "remove" ]]; then
		if [[ $(uname) == "Darwin" ]]; then
			brew uninstall go || true
		else
			sudo apt-get -y remove golang-go
			sudo add-apt-repository --remove -y ppa:longsleep/golang-backports
		fi

	else
		if [[ $(uname) == "Darwin" ]]; then
			brew install go || true
		else
			sudo add-apt-repository -y ppa:longsleep/golang-backports
			sudo apt update
			sudo apt install -y golang-go
			GOPATH=$(go env GOPATH)
			if ! grep "$GOPATH/bin" $bashProfile; then
				echo "...To set GOPATH/bin and GOBIN"
				sudo sed -i "1 i\export PATH=\$PATH:$GOPATH/bin" $bashProfile
				sudo sed -i "1 i\export GOBIN=$GOPATH/bin" $bashProfile
			else
				echo "GOPATH/bin found in $bashProfile"
			fi
		fi
	fi
}
function install_libtool() {
	if [[ $(uname) == "Darwin" ]]; then
		brew install libtool
	else
		sudo apt-get install -y libtool
	fi
}

function golang_dep() {
	echo "install dep..."
	if [[ $(uname) == "Darwin" ]]; then
		brew install dep
	else
		if [[ -z "$GOBIN" ]]; then
			if [[ -z "$GOPATH" ]]; then
				echo install dep failed: GOPATH not found
				exit 1
			fi
			export GOBIN=$GOPATH/bin/
		fi
		mkdir -p $GOBIN
		curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
		if ! echo $PATH | grep "$GOBIN"; then
			export PATH=$PATH:$GOBIN # ephemeral
		fi
	fi
	dep version
}
function gitSync() {
	git pull
	git submodule update --init --recursive
}
function java8() {
	sudo add-apt-repository -y ppa:webupd8team/java
	sudo apt update
	sudo apt install -y oracle-java8-installer
	sudo apt install -y oracle-java8-set-default
}
function softHSM(){
    if [[ $(uname) == "Darwin" ]]; then
        brew install softhsm
#        A CA file has been bootstrapped using certificates from the SystemRoots
#keychain. To add additional certificates (e.g. the certificates added in
#the System keychain), place .pem files in
#  /usr/local/etc/openssl/certs
#
#and run
#  /usr/local/opt/openssl/bin/c_rehash
#
#openssl is keg-only, which means it was not symlinked into /usr/local,
#because Apple has deprecated use of OpenSSL in favor of its own TLS and crypto libraries.
#
#If you need to have openssl first in your PATH run:
#  echo 'export PATH="/usr/local/opt/openssl/bin:$PATH"' >> ~/.bash_profile
#
#For compilers to find openssl you may need to set:
#  export LDFLAGS="-L/usr/local/opt/openssl/lib"
#  export CPPFLAGS="-I/usr/local/opt/openssl/include"
    else
        :
    fi
}
fabricInstall(){
    curl -sSL http://bit.ly/2ysbOFE | bash -s 1.4.0 1.4.0 0.4.14
}
function sync() {
	cd $CURRENT/nodejs
	npm install
	npm prune
	cd -
	cd $CURRENT/docker/nodejs
	npm install
	npm prune
	cd -
}
if [[ -n "$fcn" ]]; then
	$fcn $remain_params
else
	# install home brew
	if [[ $(uname) == "Darwin" ]]; then
		if ! brew config >/dev/null; then
			/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
		fi
	else
	    sudo apt install -y make
	    sudo apt install -y g++
	fi

	$CURRENT/docker/install.sh
	$CURRENT/docker/nodejs/install.sh
	$CURRENT/docker/nodejs/install.sh packageLock false
	sync
fi
