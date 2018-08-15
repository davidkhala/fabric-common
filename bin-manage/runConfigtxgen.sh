#!/usr/bin/env bash

# For integration most path is absolute path

CURRENT=$(cd $(dirname ${BASH_SOURCE}); pwd)

BIN_PATH="$(dirname $CURRENT)/bin"
if [ -z "$FABRIC_CFG_PATH" ];then
    export FABRIC_CFG_PATH=$CURRENT
fi

fcn=$1
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done


function genBlock() {
    local outPutFile=$1
    local profile=$2
    local channelName=${3:-testchainid}
	local CMD="$BIN_PATH/configtxgen -outputBlock $outPutFile -profile $profile -channelID $channelName"
	echo CMD $CMD
	$CMD
}

function genChannel() {
    local outPutFile=$1
    local profile=$2
    local channelName=$3
	local CMD="$BIN_PATH/configtxgen -outputCreateChannelTx $outPutFile -profile $profile -channelID $channelName"
	echo CMD $CMD
	$CMD
}

function genAnchorPeers(){
    local outPutFile=$1
    local profile=$2
    local channelName=$3
    local asOrg=$4
	local CMD="$BIN_PATH/configtxgen -outputAnchorPeersUpdate $outPutFile -profile $profile -channelID $channelName -asOrg $asOrg"
	echo CMD $CMD
	$CMD
}

$fcn $remain_params