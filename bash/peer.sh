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

package() {
	local chaincodeId=${chaincodeId}
	local chaincodePath=${chaincodePath}
	local chaincodeVersion=${chaincodeVersion:-0.0.0}
	local chaincodeType=${chaincodeType:-golang}
	local instantiatePolicy=$1
	local outputfile=${2:-"${chaincodeId}-${chaincodeVersion}.chaincodePack"}
	#	if --cc-package is not specified, the ouput raw CC deployment spec is deployable while skipping current inline instantiate policy setting
	local optionTokens="-n ${chaincodeId} -p ${chaincodePath} -v ${chaincodeVersion} -l ${chaincodeType}"
	if [[ -n "${instantiatePolicy}" ]]; then
		optionTokens="$optionTokens --instantiate-policy ${instantiatePolicy} --cc-package"
	fi
	local cmd="peer chaincode package ${optionTokens} ${outputfile}"
	echo $cmd
	$cmd
}
"$@"
