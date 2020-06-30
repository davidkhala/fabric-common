#!/usr/bin/env bash
CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)

BIN_PATH="$(dirname $CURRENT)/bin"
export FABRIC_CFG_PATH=${FABRIC_CFG_PATH:-"$CURRENT"}

genBlock() {
	local outputFile=$1
	local profile=$2
	local channelName=${3:-testchainid}
	local CMD="$BIN_PATH/configtxgen -outputBlock $outputFile -profile $profile -channelID $channelName"
	echo CMD $CMD
	$CMD
}

genChannel() {
	local outputFile=$1
	local profile=$2
	local channelName=$3
	local CMD="$BIN_PATH/configtxgen -outputCreateChannelTx $outputFile -profile $profile -channelID $channelName"
	echo CMD $CMD
	$CMD
}

genAnchorPeers() {
	local outputFile=$1
	local profile=$2
	local channelName=$3
	local asOrg=$4
	local CMD="$BIN_PATH/configtxgen -outputAnchorPeersUpdate $outputFile -profile $profile -channelID $channelName -asOrg $asOrg"
	echo CMD $CMD
	$CMD
}

viewBlock() {
	local blockFile=$1
	local profile=$2
	local channelName=${3:-testchainid}
	local viewOutputFile=$4
	local CMD="$BIN_PATH/configtxgen -inspectBlock $blockFile -profile $profile"
	echo CMD $CMD
	if [ -z "$viewOutputFile" ]; then
		$CMD
	else
		$CMD >"$viewOutputFile"
	fi
}

viewChannel() {
	local channelFile=$1
	local profile=$2
	local channelID=$3
	local viewOutputFile=$4
	local CMD="$BIN_PATH/configtxgen -inspectChannelCreateTx $channelFile -profile $profile -channelID $channelID"
	echo CMD $CMD
	if [ -z "$viewOutputFile" ]; then
		$CMD
	else
		$CMD >"$viewOutputFile"
	fi
}

"$@"
