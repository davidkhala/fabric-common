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
	echo "[WARNING] This is to install OpenJDK, Oracle requires fee to use Java in production."
	sudo apt update
	sudo apt install -y default-jdk
}
softHSMInstall() {
#	 FIXME: for macOS
	  sudo apt update
		sudo apt-get install -y softhsm2

}
fabricInstall() {
	#	If you want the latest production release, omit all version identifiers.
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- -s $1
}
brew() {
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
