#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

BIN_PATH="$CURRENT/../../bin"
cd $BIN_PATH
ACTION=$1
if [ "$ACTION" == "start" ]; then
	# NOTE: some unknown process occupied 7059 when no configtxlator => [tcp6       0      0 127.0.0.1:7059          127.0.0.1:60350         TIME_WAIT   -]
	if netstat -pant | grep '7059' | grep 'LISTEN'; then
		echo 7059 occupied, skip
	else
		./configtxlator start &>/dev/null &
	fi
elif [ "$ACTION" == "down" ]; then
	pid=$(netstat -pant | grep '7059' | grep 'LISTEN' | awk '{split($7, a, "/");print a[1]}')
	kill $pid
fi
