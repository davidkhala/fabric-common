#!/usr/bin/env bash

CORE_PEER_TLS_KEY_FILE=""
CORE_PEER_TLS_CERT_FILE=""
CORE_PEER_TLS_ROOTCERT_FILE=""
ordererEndpoint="orderer1.test.mediconcen.com:7050"
ordererHostname=""
function channelList() {
    local CMD="peer channel list --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE"
    if [[ -n ${ordererHostname} ]]; then
        CMD="$CMD --ordererTLSHostnameOverride=$ordererHostname"
    fi
    echo $CMD
    $CMD

}
function channelConfig() {
    local channelName=$1

    local CMD="peer channel fetch --tls --cafile=$CORE_PEER_TLS_ROOTCERT_FILE --certfile=$CORE_PEER_TLS_CERT_FILE --keyfile=$CORE_PEER_TLS_KEY_FILE -c=$channelName -o=$ordererEndpoint"

    if [[ -n ${ordererHostname} ]]; then
        CMD="$CMD --ordererTLSHostnameOverride=$ordererHostname"
    fi
    echo $CMD
    $CMD
}
