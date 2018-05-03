#!/usr/bin/env bash

# For integration most path is absolute path

CURRENT=$(cd $(dirname ${BASH_SOURCE}); pwd)

BIN_PATH="$(dirname $CURRENT)/bin"
export FABRIC_CFG_PATH=$CURRENT

PROFILE_DEFAULT_CHANNEL="SampleEmptyInsecureChannel"
PROFILE_DEFAULT_BLOCK="SampleInsecureSolo"

PARAM_PROFILE=""
PARAM_CHANNEL_ID=""

function usage() {
	echo "usage: ./runConfigtxgen.sh block|channel|update view|create <target_file>"
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
	local CMD="$BIN_PATH/configtxgen -inspectBlock $1 $PARAM_PROFILE"
	echo CMD $CMD
	if [ -z "$VIEW_LOG" ]; then
		$CMD
	elif [ "$VIEW_LOG" == "default" ]; then
		mkdir -p "$FABRIC_CFG_PATH/logs/"
		$CMD >"$FABRIC_CFG_PATH/logs/$(basename $1).block.config"
	else
		$CMD >"$VIEW_LOG"
	fi
}

function viewChannel() {
	local CMD="$BIN_PATH/configtxgen -inspectChannelCreateTx $1 $PARAM_PROFILE"
	echo CMD $CMD
	if [ -z "$VIEW_LOG" ]; then
		$CMD
	elif [ "$VIEW_LOG" == "default" ]; then
		mkdir -p "$FABRIC_CFG_PATH/logs/"
		$CMD >"$FABRIC_CFG_PATH/logs/$(basename $1).channel.config"
	else
		$CMD >"$VIEW_LOG"
	fi
}

function genBlock() {
	local CMD="$BIN_PATH/configtxgen -outputBlock $1 $PARAM_PROFILE $PARAM_CHANNEL_ID"
	echo CMD $CMD
	$CMD
}

function genChannel() {
	# Cannot define a new channel with no Application section
	local CMD="$BIN_PATH/configtxgen -outputCreateChannelTx $1 $PARAM_PROFILE $PARAM_CHANNEL_ID"
	echo CMD $CMD
	$CMD
}

remain_params=""
for ((i = 4; i <= $#; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

while getopts "p:c:t:vi:" shortname $remain_params; do
	case $shortname in
	p)
		echo "profile $OPTARG"
		PARAM_PROFILE="-profile $OPTARG"
		;;
	c)
		echo "(ACTION create only) channelID $OPTARG (default: testchainid)"
		PARAM_CHANNEL_ID="-channelID $OPTARG"
		;;
	t)
		echo "(ACTION view only) saving view output: $OPTARG"
		VIEW_LOG=$OPTARG
		;;
	v)
		echo "(ACTION view only) saving view output to default"
		echo " block ==> \$FABRIC_CFG_PATH/$PARAM_PROFILE.block.config"
		echo " channel ==> \$FABRIC_CFG_PATH/$PARAM_PROFILE.channel.config"
		VIEW_LOG="default"
		;;
	i)
		echo "set to env var FABRIC_CFG_PATH: $OPTARG "
		echo "  >ACTION create: as parent directory of configtx.yaml "
		echo "  >ACTION view:   as default parent directory of log file"
		export FABRIC_CFG_PATH=$OPTARG
		;;
	?)
		echo "unknown argument"
		exit 1
		;;
	esac
done

if [ "$1" == "block" ]; then
	if [ -z "$PARAM_PROFILE" ]; then
		PARAM_PROFILE="-profile $PROFILE_DEFAULT_BLOCK"
	fi
	if [ "$2" == "view" ]; then
		viewBlock $3
	elif [ "$2" == "create" ]; then
		genBlock $3
	else
		echo "invalid arg2: $2"
		usage
	fi
elif [ "$1" == "channel" ]; then
	if [ -z "$PARAM_PROFILE" ]; then
		PARAM_PROFILE="-profile $PROFILE_DEFAULT_CHANNEL"
	fi
	if [ "$2" == "view" ]; then
		viewChannel $3
	elif [ "$2" == "create" ]; then
		genChannel $3
	elif [ "$2" == "update" ]; then
		updateChannel $3
	else
		echo "invalid arg2: $2"
		usage
	fi
else
	echo "invalid arg1: $1"
	usage
fi
