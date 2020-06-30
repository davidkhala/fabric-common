#!/usr/bin/env bash
set -e
fcn=$1
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
if [[ -z "$SOFTHSM2_CONF" ]]; then
	echo "[ERROR] environment SOFTHSM2_CONF not set"
	exit 1
fi
if [[ ! -f "$SOFTHSM2_CONF" ]]; then
	echo "[ERROR] File $SOFTHSM2_CONF not found"
	exit 1
fi
initToken() {
	local label=$1
	local slot=$2
	local cmd="softhsm2-util --init-token --label $label"
	if [[ -n "$HSM_SO_PIN" ]]; then
		cmd="$cmd --so-pin $HSM_SO_PIN"
	fi
	if [[ -n "$slot" ]]; then
		cmd="$cmd --slot $slot"
	else
		cmd="$cmd --free "
	fi
	if [[ -n "$HSM_PIN" ]]; then
		cmd="$cmd --pin $HSM_PIN"
	fi
	$cmd
}
deleteToken() {
	local label=$1
	softhsm2-util --delete-token --token $label
}
listToken() {
	local serialOnly=$1
	if [[ -n "$serialOnly" ]]; then
		softhsm2-util --show-slots | grep 'Serial number:[[:space:]]\{4\}[[:alnum:]]' | awk '{ print $3 }'
	else
		softhsm2-util --show-slots
	fi
}
importPrivKey() {
	local label=$1
	local id=$2 # an ID of the key pair, it is assigned here
	if [[ ${#id} -lt 4 ]]; then
		echo "[ERROR] id length < 4"
		exit 1
	fi
	local privKeyPem=$3
	softhsm2-util --import $privKeyPem --token $label --label $label --id $id
}
$fcn $remain_params
