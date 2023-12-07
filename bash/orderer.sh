set -e



ordererJoin() {
  # TODO WIP where is osnadmin
    local PRIVATE_KEY=$1
    local SIGN_CERT=$2
    local CA=$3
    local CHANNEL_NAME=$CHANNEL_NAME
    osnadmin channel join --channelID $CHANNEL_NAME --config-block $working_dir/channel-artifacts/${CHANNEL_NAME}.block -o orderer0.${ORG_DOMAIN}:7053 --ca-file "$CA" --client-cert "$SIGN_CERT" --client-key "$PRIVATE_KEY"
}