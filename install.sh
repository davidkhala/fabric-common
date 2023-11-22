#!/usr/bin/env bash
set -e -x

fabricInstall() {
	#	If you want the latest production release, omit all version identifiers.
	curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/master/scripts/bootstrap.sh | bash -s -- -s "$@"
	docker pull couchdb:3.3.2
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
