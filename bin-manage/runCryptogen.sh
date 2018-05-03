#!/usr/bin/env bash
set -e
CURRENT=$(cd $(dirname ${BASH_SOURCE}); pwd)
CRYPTO_CONFIG_DIR=$CURRENT/crypto-config/
CRYPTO_CONFIG_FILE=$CURRENT/crypto-config.yaml

BIN_PATH="$(dirname $CURRENT)/bin"
remain_params=""
for ((i = 1; i <= $#; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

isAPPEND=false
while getopts "i:o:a" shortname $remain_params; do
	case $shortname in
	i)
		echo "set crypto config yaml file (default: $CRYPTO_CONFIG_FILE) --config $OPTARG"
		CRYPTO_CONFIG_FILE="$OPTARG"
		;;
	o)
		echo "set crypto output directory (default: $CRYPTO_CONFIG_DIR)  --output $OPTARG"
		CRYPTO_CONFIG_DIR="$OPTARG"
		;;
	a)
		echo "append mode: not to clear CRYPTO_CONFIG_DIR"
		isAPPEND=true
		;;
	?)
		echo "unknown argument"
		exit 1
		;;
	esac
done

if [ "$isAPPEND" == "false" ]; then
	echo "clear CRYPTO_CONFIG_DIR $CRYPTO_CONFIG_DIR"
	sudo rm -rf ${CRYPTO_CONFIG_DIR}* # keep folder itself (for work as nfs server)
	mkdir -p ${CRYPTO_CONFIG_DIR}
	sudo chmod 777 ${CRYPTO_CONFIG_DIR}
fi

# gen

$BIN_PATH/cryptogen generate --config="$CRYPTO_CONFIG_FILE" --output="$CRYPTO_CONFIG_DIR"
echo [finish] cryptogen generate --config="$CRYPTO_CONFIG_FILE" --output="$CRYPTO_CONFIG_DIR"