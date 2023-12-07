set -e

docker_exec() {
  docker exec fabric-cli osnadmin "$@"
}
docker_cp() {
  path_in_container="/opt/$(basename $1)"
  docker cp -q $1 fabric-cli:$path_in_container
  echo $path_in_container

}

join_channel() {
  # TODO WIP where is osnadmin
  local CHANNELID=$1
  local ORDERER_ADDRESS=$2
  local block=$3

  block_in_container=$(docker_cp $block)
  CA_FILE_in_container=$(docker_cp $CA_FILE)
  CERT_in_container=$(docker_cp $CLIENT_CERT)
  KEY_in_container=$(docker_cp $CLIENT_KEY)
  docker_exec channel join --channelID=$CHANNELID -o $ORDERER_ADDRESS --config-block=$block_in_container --ca-file $CA_FILE_in_container --client-cert $CERT_in_container --client-key $KEY_in_container
}
list() {
  osnadmin channel list
}
remove() {
  :
}
"$@"
