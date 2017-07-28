#!/usr/bin/env bash
CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"
CONFIG_OUTPUT=$CURRENT/crypto-config/
CONFIG_INPUT=$CURRENT/crypto-config.yaml

BIN_PATH="$CURRENT/../../bin"

remain_params=""
for (( i = 1; i <= $#; i ++ )); do
    j=${!i}
    remain_params="$remain_params $j"
done


while getopts "i:o:" shortname $remain_params; do
    case $shortname in
        i)
            echo "set crypto config yaml file (default: crypto-config.yaml) --config $OPTARG"
            CONFIG_INPUT="$OPTARG"
        ;;
        o)
            echo "set crypto output directory (default: /crypto-config/)  --output $OPTARG"
            CONFIG_OUTPUT="$OPTARG"
        ;;
        ?)
            echo "unknown argument"
            exit 1
        ;;
    esac
done



echo "clear CONFIG_OUTPUT $CONFIG_OUTPUT"
rm -rf $CONFIG_OUTPUT
# gen
cd $BIN_PATH

./cryptogen generate --config="$CONFIG_INPUT" --output="$CONFIG_OUTPUT"

cd -
