#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

BIN_PATH="$CURRENT/../../bin"
cd $BIN_PATH
ACTION=$1
if [ "$ACTION" == "start" ]; then

	if netstat -pant | grep '7059'; then
		echo 7059 occupied, skip
	else
		./configtxlator start &>/dev/null &
	fi
elif [ "$ACTION" == "down" ];then
	pid=$(netstat -pant | grep '7059' | awk '{split($7, a, "/");print a[1]}')
	kill $pid
fi
