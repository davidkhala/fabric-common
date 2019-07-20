#!/usr/bin/env bash
CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)

BIN_PATH="$(dirname $CURRENT)/bin"

up() {
	if netstat -pant | grep '7059' | grep 'LISTEN'; then
		echo 7059 occupied, skip
	else
		$BIN_PATH/configtxlator start &>/dev/null &
		echo configtxlator start
	fi
}
down() {
	pid=$(netstat -pant | grep '7059' | grep 'LISTEN' | awk '{split($7, a, "/");print a[1]}')
	if [[ -n "$pid" ]]; then
		kill $pid # kill with no arguments: kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]
		echo kill $pid configtxlator
	else
		echo "no process found for configtxlator"
	fi
}
$1
if [[ -n "$1" ]]; then
	$1
else
	down
	up
fi
