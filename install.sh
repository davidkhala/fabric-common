#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

$CURRENT/docker/nodejs/install.sh
$CURRENT/docker/install.sh

function golang() {
	# install golang
	sudo add-apt-repository ppa:longsleep/golang-backports -y
	sudo apt-get update
	sudo apt-get install -y golang-go
}
