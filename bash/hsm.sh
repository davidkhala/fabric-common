#!/usr/bin/env bash
set -e
fcn=$1
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
if [[ ! -f "$SOFTHSM2_CONF" ]]; then
	echo "[ERROR] environment SOFTHSM2_CONF not found"
	exit 1
fi
initToken() {
	local label=$1
	softhsm2-util --init-token --free --label $label
}
deleteToken() {
	local label=$1
	softhsm2-util --delete-token --token $label
}
listToken() {
	softhsm2-util --show-slots
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
