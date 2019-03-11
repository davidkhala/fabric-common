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
ordererHostname=$ordererHostname
function channelList() {
    local CMD="peer channel list --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE"
    echo $CMD
    $CMD

}
function channelConfig() {
    local channelName=$1
    local ordererEndPoint=$2
    if [[ -z ${channelName} ]]; then
        echo "channelName as 1st parameter is required"
        exit 1
    fi
#    if [[ -z ${ordererEndPoint} ]]; then
#        echo " 'ordererEndPoint' as 2nd parameter is required"
#        exit 1
#    fi
    local CMD="peer channel fetch --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE -c=$channelName"

    if [[ -n ${ordererHostname} ]]; then
        CMD="$CMD --ordererTLSHostnameOverride=$ordererHostname"
    fi
    echo $CMD
    $CMD
}

$fcn $remain_params