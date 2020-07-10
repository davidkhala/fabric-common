#!/usr/bin/env bash
set -e

golang() {
	curl --silent --show-error https://raw.githubusercontent.com/davidkhala/goutils/master/scripts/install.sh | bash -s latest $1
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
	#	If you want the latest production release, omit all version identifiers.
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- -s $1
}
brew(){
	# install home brew
	if [[ $(uname) == "Darwin" ]]; then
		if ! brew config >/dev/null; then
			/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
		fi
	fi
}
if [[ -n "$1" ]]; then
	"$@"
else
	dockerInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/docker-manager/master/install.sh"
	$dockerInstall | bash -s installDocker
	nodejsInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/install.sh"
	$nodejsInstall | bash -s nodeGYPDependencies
	$nodejsInstall | bash -s install12
	curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/scripts/npm.sh | bash -s packageLock false
fi
