join_channel() {
  export CLIENT_KEY=~/delphi-fabric/config/ca-crypto-config/ordererOrganizations/hyperledger/client/clientKey
  export CLIENT_CERT=~/delphi-fabric/config/ca-crypto-config/ordererOrganizations/hyperledger/client/clientCert
  export CA_FILE=~/delphi-fabric/config/ca-crypto-config/ordererOrganizations/hyperledger/msp/tlscacerts/tlsca.hyperledger-cert.pem
  ../orderer.sh join_channel allchannel orderer0.hyperledger:9443 /home/davidliu/delphi-fabric/config/configtx/all.block
}
$1
