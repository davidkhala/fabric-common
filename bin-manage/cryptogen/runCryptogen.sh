#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"
CONFIG_OUTPUT=$CURRENT/crypto-config
CONFIG_INPUT=$CURRENT/cryptogen.yaml
# clear existing
MODE=$1

function clearOutput() {
	echo "clear CONFIG_OUTPUT $CONFIG_OUTPUT"
	rm -rf $CONFIG_OUTPUT
}

function gen() {
	cd $CURRENT/../../bin

	./cryptogen generate --config="$CONFIG_INPUT" --output="$CONFIG_OUTPUT"

	cd $CURRENT
}
if [ "${MODE}" == "clear" ]; then
	clearOutput
fi
gen
