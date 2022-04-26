#!/usr/bin/env bash
set -e

CORE_PEER_TLS_KEY_FILE=$CORE_PEER_TLS_KEY_FILE
CORE_PEER_TLS_CERT_FILE=$CORE_PEER_TLS_CERT_FILE
CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE

tlsOptions="--tls --cafile=${CORE_PEER_TLS_ROOTCERT_FILE} --certfile=${CORE_PEER_TLS_CERT_FILE} --keyfile=${CORE_PEER_TLS_KEY_FILE}"
channelList() {
	local CMD="peer channel list ${tlsOptions}"
	echo $CMD
	$CMD

}
JoinChain() {
	# Path to file containing genesis block
	# peer.sh JoinChain peer0.astri.org ~/Documents/delphi-fabric/config/configtx/all.block
	local container=$1
	local fileName=$(basename $2)
	local CMD="peer channel join --blockpath=/etc/hyperledger/fabric/$fileName"
	docker cp $2 "$container:/etc/hyperledger/fabric/$fileName"
	docker exec $1 $CMD
	# TODO Error: proposal failed (err: bad proposal response 500: access denied for [JoinChain][allchannel]: [Failed verifying that proposal's creator satisfies local MSP principal during channelless check policy with policy [Admins]: [This identity is not an admin]])

}

#Usage:
#  peer channel fetch <newest|oldest|config|(number)> [outputfile] [flags]

channelConfig() {
	local channelName=$1
	local ordererEndPoint=$2
	local ordererHostname=$3
	if [[ -z ${ordererEndPoint} ]]; then
		echo " 'ordererEndPoint' as 2nd parameter is required, otherwise: Error: can't read the block: &{NOT_FOUND}"
		exit 1
	fi
	local CMD="peer channel fetch config ${tlsOptions} -c=${channelName} -o=${ordererEndPoint}"
	if [[ -n ${ordererHostname} ]]; then
		CMD="$CMD --ordererTLSHostnameOverride=$ordererHostname"
	fi
	echo $CMD
	$CMD
}
chaincodeInstantiated() {
	local channelName=$1
	peer chaincode list --instantiated --channelID $channelName ${tlsOptions}
}
chaincodeInstalled() {
	#  TODO WIP
	peer lifecycle chaincode queryinstalled
}
package() {
	#  TODO WIP
	local chaincodeType=${chaincodeType:-golang}
	local label=$chaincodeId
	local chaincodePath=$chaincodePath
	local outputfile=${1:-"${label}.tar.gz"}
	peer lifecycle chaincode package $outputfile --lang $chaincodeType --path $chaincodePath --label $label
}
packageID(){
	local label=$chaincodeId
	local outputfile=${1:-"${label}.tar.gz"}
	echo $label:$(sha256sum ${outputfile} | awk '{print $1}')
}

install() {
	#  TODO WIP
	local ccPackage=$1
	peer lifecycle chaincode install $1
}
"$@"
