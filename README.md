# fabric-common

Latest version 1.4.0
# Installation
- init submodule
    `./install gitSync`



# Notes

- `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- blockHeight(got from queryChain) indexing from 1, blockNumber in blockEvent starting from 0
- requirePeerCount <= peerCount - 1 (1 for peer itself)
- "2-of" collectionPolicy is not allowed
- dep could only be run under system $GOPATH,
- nodejs chaincode take longer time in install chaincode only.
- peer.response in chaincode.Init cannot be recovered from proposal response. stub.GetState is meaningless in Init 
- playback conference: https://wiki.hyperledger.org/doku.php?id=projects/fabric/playbacks
- Note that collections cannot be deleted, 
    as there may be prior private data hashes on the channel’s blockchain that cannot be removed.
- `txId` is required in peer join channel because: [bret Harrison]There is a transaction proposal to the system chaincode, so a transaction id is required.
- impossible: join channel without orderer 
- backup recovery: at least 1 anchor peer for each organization should be resumed to recover transaction process   
# DONE
- discovery service, endorsement hints
- transient map context keep persistent when cross chaincode
- [FABN-1130] Stop using "init" as default function name 
- 1.4 operation enhance: 
The /metrics endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes.
# In progress
- collectionConfig.memberOnlyRead is not implemented in sdk-node 


# TODO
- npm couchdb-dump in nodejs/couchdbDump.sh
- level db navigator(https://github.com/Level/level or https://github.com/syndtr/goleveldb) and richQuery for leveldb
- peer leveldb analyzer
- 1.4 operation enhance: 
Metrics can also be pushed to StatsD.
- NodeOUs enable
- dig into block event: 
        Dave Enyeart: The block event includes the full transactions of the block, including the read/write sets, which in the case of private data includes the hashes of the private key/values.
- channelEventHub.disconnect status sync        
# Fabric weakness
- gossip timeline is outside of blockchain,  for massive data scenario, gossip will fall behind transaction event

- chaos in discoveryRequest.interests: https://gerrit.hyperledger.org/r/#/c/28446/
- keystore object un-promisify: https://gerrit.hyperledger.org/r/#/c/24749/
- endpoint ping: https://gerrit.hyperledger.org/r/#/c/28115/
- fabric RSA key support
- `instantiate policy` is not `endorsemnet policy`, it is used during chaincode packaging/install determining who is able
 to instantiate/upgrade chaincode, it is partially supported in nodejs with chaincode package binary(byte[]) as input. 
 quoted from Dave Enyeart: 
 
    "They are different, instantiate policy gets packaged with a chaincode and specifies who can instantiate the chaincode, 
    see the doc starting at: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4noah.html#packaging"  
