#!/usr/bin/env bash
set -e

fcn=$1

bashProfile="$HOME/.bashrc"
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

golang() {
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
golang13() {
	sudo add-apt-repository -y ppa:longsleep/golang-backports
	sudo apt-get update
	sudo apt install golang-1.13
	sudo ln -sf /usr/lib/go-1.13/bin/go /usr/bin/go
}
install_libtool() {
	if [[ $(uname) == "Darwin" ]]; then
		brew install libtool
	else
		sudo apt-get install -y libtool
	fi
}

golang_dep() {
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

java() {
	echo "[WARNING] This is to install OpenJDK, Oracle requires fee to use Java in production."
	sudo apt update
	sudo apt install -y default-jdk
}
softHSM() {
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
		sudo apt-get install -y softhsm2
	fi
}
fabricInstall() {
	curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.0 1.4.0 0.4.14 -s
	docker pull couchdb:2.3.1
}
if [[ -n "$fcn" ]]; then
	"$@"
else
	homebrewUtil="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/mac-utils/master/brew.sh"
	# install home brew
	$homebrewUtil | bash -s install

	dockerInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/docker-manager/master/install.sh"
	$dockerInstall | bash -s installDocker
	$dockerInstall | bash -s installjq
	nodejsInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/install.sh"
	$nodejsInstall | bash -s nodeGYPDependencies
	$nodejsInstall | bash -s install10

	curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/scripts/npm.sh | bash -s packageLock false
fi
