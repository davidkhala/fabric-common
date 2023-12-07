export PATH=$PATH:../../bin/
package() {
  export chaincodeId=diagnose
  export chaincodePath=github.com/davidkhala/chaincode/golang/diagnose
  export FABRIC_CFG_PATH=$PWD
  export CORE_PEER_LOCALMSPID=astriMSP
  export CORE_PEER_MSPCONFIGPATH=$HOME/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer2.astri.org/msp
  ../peer.sh package
}
$1
