#!/usr/bin/env bash
fcn=$1
FILTER="dev"
if [ -n "$2" ]; then
	FILTER=$2
fi
function container() {
	CONTAINER_IDS=$(docker ps -a | grep "$FILTER" | awk '{ print $1 }')
	if [ -n "$CONTAINER_IDS" ]; then
		docker rm -f $CONTAINER_IDS
	fi
}
function image() {
	DOCKER_IMAGE_IDS=$(docker images | grep "$FILTER" | awk '{print $3}')
	if [ -n "$DOCKER_IMAGE_IDS" ]; then
		docker image rm --force $DOCKER_IMAGE_IDS
	fi
}
$fcn
