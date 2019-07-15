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

channelList() {
    local CMD="peer channel list --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE"
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
    local CMD="peer channel fetch config --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE -c=$channelName -o=$ordererEndPoint"
    if [[ -n ${ordererHostname} ]]; then
        CMD="$CMD --ordererTLSHostnameOverride=$ordererHostname"
    fi
    echo $CMD
    $CMD
}
chaincodeInstantiated(){
    local channelName=$1
    peer chaincode list --instantiated --channelID $channelName --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE
}
$fcn $remain_params
