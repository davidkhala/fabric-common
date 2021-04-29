#!/usr/bin/env bash
set -e -x

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
	if [[ $(uname) == "Darwin" ]]; then
		echo "XCode should embed OpenJDK already"
		java --version
	else
		echo "[WARNING] This is to install OpenJDK, Oracle requires fee to use Java in production."
		sudo apt install -y default-jdk
	fi

}
softHSMInstall() {
	if [[ $(uname) == "Darwin" ]]; then
		HOMEBREW_NO_AUTO_UPDATE=1 brew install softhsm
	else
		sudo apt-get install -y softhsm2
	fi
}

fabricInstall() {
	#	If you want the latest production release, omit all version identifiers.
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- -s $1
	docker pull couchdb:3.1
}
if [[ -n "$1" ]]; then
	"$@"
else
	npm config set package-lock false
	if [[ -z "$CI" ]]; then
		curl --silent --show-error https://raw.githubusercontent.com/davidkhala/docker-manager/master/install.sh | bash -s installDocker
		nodejsInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/install.sh"
		$nodejsInstall | bash -s nodeGYPDependencies
		$nodejsInstall | bash -s install12
	fi
fi
