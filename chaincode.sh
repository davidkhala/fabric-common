#!/usr/bin/env bash
fcn=$1
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
function rmContainers() {
	local FILTER=${1:-dev}
	CONTAINER_IDS=$(docker ps -a | grep "$FILTER" | awk '{ print $1 }')
	if [ -n "$CONTAINER_IDS" ]; then
		docker rm -f $CONTAINER_IDS
	fi
}
function rmImages() {
	local FILTER=${1:-dev}
	DOCKER_IMAGE_IDS=$(docker images | grep "$FILTER" | awk '{print $3}')
	if [ -n "$DOCKER_IMAGE_IDS" ]; then
		docker image rm --force $DOCKER_IMAGE_IDS
	fi
}
function couchDBIndex() {
	local root=$1
	local fileName=index.json
	local fields=""
	for ((i = 2; i < ${#}; i++)); do
		j=${!i}
		fields="\"$j\",$fields"
	done
	j=${!i}
	fields="$fields\"$j\""

	local parent=$root/META-INF/statedb/couchdb/indexes/
	mkdir -p ${parent}
	cd ${parent}
	echo "{\"index\":{\"fields\":[${fields}]},\"type\":\"json\"}" >${parent}$fileName
}
$fcn $remain_params
