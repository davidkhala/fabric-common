#!/usr/bin/env bash
CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)

BIN_PATH="$(dirname $CURRENT)/bin"

up() {
	if netstat -pant | grep '7059' | grep 'LISTEN'; then
		echo 7059 occupied, skip
	else
		$BIN_PATH/configtxlator start &> /dev/null &
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
encode() {
	local TYPE=common.Config #
	local inputJSON=$1
	local outputProto=$2
	# Converts a JSON document to protobuf.
	local CMD="$BIN_PATH/configtxlator proto_encode --type=$TYPE --input=$inputJSON"
	if [ -z "$inputJSON" ]; then
		echo JSON file as input is required
		exit 1
	fi
	if [ -n "$outputProto" ]; then
		CMD="$CMD --output=$outputProto"
	fi
	echo $CMD
	$CMD

}
"$@"
