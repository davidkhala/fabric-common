# fabric-common

Latest version 1.4.0
# Installation
- init submodule
    `./install gitSync`



# build v1.1.0
see [Build 1.1](./BUILD1.1.md)

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

# DONE
- discovery service, endorsement hints

# TODO
- npm couchdb-dump in nodejs/couchdbDump.sh
- is transient map included context when cross chaincode?
- level db navigator(https://github.com/Level/level or https://github.com/syndtr/goleveldb) and richQuery for leveldb
- peer leveldb analyzer
- 1.4 operation enhance: 
The /metrics endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes. Metrics can also be pushed to StatsD.
- NodeOUs enable

# Fabric weakness
- gossip timeline is outside of blockchain,  for massive data scenario, gossip will fall behind transaction event
- `args.push(Buffer.from(request.fcn ? request.fcn : 'init', 'utf8'));` we should use fcn ='' as default
- chaos in discoveryRequest.interests
- keystore object un-promisify
- endpoint ping
- fabric RSA key support
- `instantiate policy` is not `endorsemnet policy`, it is used during chaincode packaging/install determining who is able
 to instantiate/upgrade chaincode, it is partially supported in nodejs with chaincode package binary(byte[]) as input. 
 quoted from Dave Enyeart: 
 
    "They are different, instantiate policy gets packaged with a chaincode and specifies who can instantiate the chaincode, 
    see the doc starting at: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4noah.html#packaging"  
- TODO collectionConfig.memberOnlyRead is not implemented in sdk-node 
