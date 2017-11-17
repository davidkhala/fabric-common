#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

BIN_PATH="$(dirname $(dirname $CURRENT))/bin"
ACTION=$1
if [ "$ACTION" == "start" ]; then
	# NOTE: some unknown process occupied 7059 when no configtxlator => [tcp6       0      0 127.0.0.1:7059          127.0.0.1:60350         TIME_WAIT   -]
	if netstat -pant | grep '7059' | grep 'LISTEN'; then
		echo 7059 occupied, skip
	else
		$BIN_PATH/configtxlator start &>/dev/null &
	fi
elif [ "$ACTION" == "down" ]; then
	pid=$(netstat -pant | grep '7059' | grep 'LISTEN' | awk '{split($7, a, "/");print a[1]}')
	if [ -n "$pid" ]; then
		kill $pid # kill with no arguments: kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]
	fi
fi
