#!/usr/bin/env bash
set -e -x

softHSMInstall() {
	if [[ $(uname) == "Darwin" ]]; then
		HOMEBREW_NO_AUTO_UPDATE=1 brew install softhsm
	else
		sudo apt-get install -y softhsm2
	fi
}

fabricInstall() {
	#	If you want the latest production release, omit all version identifiers.
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- -s "$@"
	docker pull couchdb:3.1.1
}
if [[ -n "$1" ]]; then
	"$@"
else
	
	if [[ -z "$CI" ]]; then
		curl --silent --show-error https://raw.githubusercontent.com/davidkhala/docker-manager/master/install.sh | bash -s Docker
		nodejsInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/install.sh"
		if [[ $(uname) == "Darwin" ]]; then
			# TODO build-essential
			brew install python && true
		else
			$nodejsInstall | bash -s nodeGYPDependencies
		fi
		$nodejsInstall | bash -s LTS
	fi
fi
