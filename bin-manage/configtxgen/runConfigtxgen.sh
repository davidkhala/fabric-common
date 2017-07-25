#!/usr/bin/env bash

# for integration most path is absolute path

CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"

BIN_PATH="$CURRENT/../../bin"
export FABRIC_CFG_PATH=$CURRENT

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
    local CMD="./configtxgen -inspectBlock $1 $MORE_PARAMS"
    echo CMD $CMD
    if [ -z "$VIEW_LOG" ]; then
        $CMD
    elif [ "$VIEW_LOG" == "default" ]; then
        $CMD >"$FABRIC_CFG_PATH/$PARAM_profile.block.config"
    else
        $CMD >"$VIEW_LOG"
    fi
}

function viewChannel() {
    local CMD="./configtxgen -inspectChannelCreateTx $1 $MORE_PARAMS"
    echo CMD $CMD
    if [ -z "$VIEW_LOG" ]; then
        $CMD
    elif [ "$VIEW_LOG" == "default" ]; then
        $CMD >"$FABRIC_CFG_PATH/$PARAM_profile.channel.config"
    else
        $CMD >"$VIEW_LOG"
    fi
}

function genBlock() {
    local CMD="./configtxgen -outputBlock $1 $MORE_PARAMS"
    if [ -z "$PARAM_profile" ]; then
        CMD="$CMD -profile $PROFILE_DEFAULT_BLOCK"
    fi
    echo CMD $CMD
    $CMD
}

function genChannel() {
    # Cannot define a new channel with no Application section
    local CMD="./configtxgen -outputCreateChannelTx $1 $MORE_PARAMS"
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


while getopts "p:c:t:vi:" shortname $remain_params; do
    case $shortname in
        p)
            echo "profile $OPTARG"
            PARAM_profile=" -profile $OPTARG"
        ;;
        c)
            echo "(TYPE channel only)channelID $OPTARG"
            PARAM_channelID=" -channelID $OPTARG"
        ;;
        t)
            echo "(ACTION view only) saving view output: $OPTARG"
            VIEW_LOG=$OPTARG
        ;;
        v)
            echo "(ACTION view only) saving view output to default"
            echo " block ==> \$FABRIC_CFG_PATH/$PARAM_profile.block.config"
            echo " channel ==> \$FABRIC_CFG_PATH/$PARAM_profile.channel.config"
            VIEW_LOG="default"
        ;;
        i)
            echo "set to env var FABRIC_CFG_PATH: $OPTARG "
            echo "  >ACTION create: as parent directory of configtx.yaml "
            echo "  >ACTION view:   as default parent directory of log file"
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
