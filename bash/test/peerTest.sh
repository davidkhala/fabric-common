export PATH=$PATH:../../bin/
package() {
	export chaincodeId=diagnose
	export chaincodePath=github.com/davidkhala/chaincode/golang/diagnose
	export FABRIC_CFG_PATH=./config/1/
	export CORE_PEER_MSPCONFIGPATH=$HOME/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer2.astri.org/msp
	../peer.sh package "AND('icddMSP.member')"
}
signPackage() {
	export FABRIC_CFG_PATH=./config/1/
	export CORE_PEER_MSPCONFIGPATH=$HOME/Documents/delphi-fabric/config/ca-crypto-config/peerOrganizations/astri.org/peers/peer2.astri.org/msp
	../peer.sh signPackage diagnose-0.0.0.chaincodePack
}
$1
