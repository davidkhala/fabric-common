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
	softhsm2-util --init-token --slot=0 --label $label
}
deleteToken() {
	local label=$1
	softhsm2-util --delete-token --token $label
}
listToken() {
	softhsm2-util --show-slots
}
$fcn $remain_params
