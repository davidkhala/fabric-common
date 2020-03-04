#!/usr/bin/env bash
set -e
fcn=$1
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

CORE_PEER_TLS_KEY_FILE=$CORE_PEER_TLS_KEY_FILE
CORE_PEER_TLS_CERT_FILE=$CORE_PEER_TLS_CERT_FILE
CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE

tlsOptions="--tls --cafile=${CORE_PEER_TLS_ROOTCERT_FILE} --certfile=${CORE_PEER_TLS_CERT_FILE} --keyfile=${CORE_PEER_TLS_KEY_FILE}"
channelList() {
	local CMD="peer channel list ${tlsOptions}"
	echo $CMD
	$CMD

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
install() {
	#  TODO WIP
	local ccPackage=$1
	peer lifecycle chaincode install $1
}
$fcn $remain_params
