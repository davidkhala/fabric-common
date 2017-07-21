#!/usr/bin/env bash

CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

BIN_PATH="$CURRENT/../../bin"
export FABRIC_CFG_PATH=$CURRENT
inputDir=$CURRENT/
outputDir=$CURRENT/ # if not set, output file will be created in BIN_PATH

PROFILE_DEFAULT_CHANNEL="SampleEmptyInsecureChannel"
PROFILE_DEFAULT_BLOCK="SampleInsecureSolo"


MORE_PARAMS=""
PARAM_profile=""
PARAM_channelID=""
PARAM_asOrg=""

function usage() {
    echo "usage: ./runConfigtxgen.sh block|channel view|create <target_file>"
    echo " configtx.yaml will be indexed under env var: FABRIC_CFG_PATH "

    echo
    echo " 1. make sure msp config in configtx.yaml is valid. By default(1.0rc1), it could be  "
    echo "      crypto-config/ordererOrganizations/example.com/msp  "
    echo " 2. take care of crypto material identity, different identities will leads to different block/channel"
    echo "      See it by block|channel view "
    echo "          block view-->Channel.Groups.Orderer.Groups.OrdererMSP.Values.MSP.Value.config"
    echo "          channel view-->"
}



function viewBlock() {
    local CMD="./configtxgen -inspectBlock $inputDir$1 $MORE_PARAMS"
    echo CMD $CMD
    if [ -z "$VIEW_LOG" ]; then
        $CMD
    elif [ "$VIEW_LOG" == "default" ]; then
        $CMD >"$outputDir$1.block.config"
    else
        $CMD >"$VIEW_LOG"
    fi
}

function viewChannel() {
    local CMD="./configtxgen -inspectChannelCreateTx $inputDir$1 $MORE_PARAMS"
    echo CMD $CMD
    if [ -z "$VIEW_LOG" ]; then
        $CMD
    elif [ "$VIEW_LOG" == "default" ]; then
        $CMD >"$outputDir$1.channel.config"
    else
        $CMD >"$VIEW_LOG"
    fi
}

function genBlock() {
    local CMD="./configtxgen -outputBlock $outputDir$1 $MORE_PARAMS"
    if [ -z "$PARAM_profile" ]; then
        CMD="$CMD -profile $PROFILE_DEFAULT_BLOCK"
    fi
    echo CMD $CMD
    $CMD
}

function genChannel() {
    # Cannot define a new channel with no Application section
    local CMD="./configtxgen -outputCreateChannelTx $outputDir$1 $MORE_PARAMS"
    if [ -z "$PARAM_profile" ]; then
        CMD="$CMD -profile $PROFILE_DEFAULT_CHANNEL"
    fi
    echo CMD $CMD
    $CMD
}

remain_params=""
for (( i = 4; i <= $#; i ++ )); do
    j=${!i}
    remain_params="$remain_params $j"
done


while getopts "ai:t:p:c:v" shortname $remain_params; do
    case $shortname in
        a)
            echo "using Absolute path or default BIN_PATH:$BIN_PATH  "
            echo "  as inputDir and outputDir"
            outputDir=""
            inputDir=""
        ;;
        p)
            echo "profile $OPTARG"
            PARAM_profile=" -profile $OPTARG"
        ;;
        c)
            echo "channelID $OPTARG"
            PARAM_channelID=" -channelID $OPTARG"
        ;;
        t)
            echo "saving view output: $OPTARG"
            VIEW_LOG=$OPTARG
        ;;
        v)
            echo "saving view output to default"
            VIEW_LOG="default"
        ;;

        i)

            echo "set parent directory of configtx.yaml: $OPTARG "
            echo " !!! value will be set to env var FABRIC_CFG_PATH"
            echo " please make sure '\$FABRIC_CFG_PATH/configtx.yaml' exist"
            export FABRIC_CFG_PATH=$OPTARG
        ;;
        ?) #当有不认识的选项的时候arg为?
            echo "unknown argument"
            exit 1
        ;;
    esac
done

MORE_PARAMS=$PARAM_profile$PARAM_channelID$PARAM_asOrg



cd $BIN_PATH
if [ "$1" == "block" ]; then
    if [ "$2" == "view" ]; then
        viewBlock $3
    elif [ "$2" == "create" ]; then
        genBlock $3
    else
        echo "invalid arg2: $2";
        usage
    fi
elif [ "$1" == "channel" ]; then
    if [ "$2" == "view" ]; then
        viewChannel $3
    elif [ "$2" == "create" ]; then
        genChannel $3
    else
        echo "invalid arg2: $2";
        usage
    fi
else
    echo "invalid arg1: $1";
    usage
fi
cd -
