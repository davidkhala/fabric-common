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
		fi
	fi
}
install_libtool() {
	if [[ $(uname) == "Darwin" ]]; then
		brew install libtool
	else
		sudo apt-get install -y libtool
	fi
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
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.0.0 1.4.4 0.4.18 -s
}
if [[ -n "$fcn" ]]; then
	$fcn $remain_params
else
	# install home brew
	if [[ $(uname) == "Darwin" ]]; then
		if ! brew config >/dev/null; then
			/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
		fi
	fi

	dockerInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/docker-manager/master/install.sh"
	$dockerInstall | bash -s installDocker
	$dockerInstall | bash -s installjq
	nodejsInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/install.sh"
	$nodejsInstall | bash -s nodeGYPDependencies
	$nodejsInstall | bash -s install8
	curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/scripts/npm.sh | bash -s packageLock false
fi
