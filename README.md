# fabric-common

Latest version 1.4.1
# Installation
- init submodule
    `./install gitSync`



# Notes

- `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- blockHeight(got from queryChain) indexing from 1, blockNumber in blockEvent starting from 0
- requirePeerCount <= peerCount - 1 (1 for peer itself)
- "2-of" collectionPolicy is not allowed
- [1.2] private data work only after manually set anchor peers
- dep could only be run under system $GOPATH,
- nodejs chaincode take longer time in install chaincode only.
- peer.response in chaincode.Init cannot be recovered from proposal response. stub.GetState is meaningless in Init 
- playback conference: https://wiki.hyperledger.org/doku.php?id=projects/fabric/playbacks
- Note that collections cannot be deleted, 
    as there may be prior private data hashes on the channel’s blockchain that cannot be removed.
- `txId` is required in peer join channel because: [bret Harrison]There is a transaction proposal to the system chaincode, so a transaction id is required.
- impossible: join channel without orderer 
- backup recovery: at least 1 anchor peer for each organization should be resumed to recover transaction process   
- [1.4] `logspec`:`{"spec":"chaincode=debug:info"}`, the logger is in debug mode and level is info.
- call `await stub.putPrivateData('any', "key", 'value');` without setup collection Config or in Init step:  
Error: collection config not define for namespace [node]  
See also in https://github.com/hyperledger/fabric/commit/8a705b75070b7a7021ec6f897a80898abf6a1e45
- transient map context keep persistent when cross chaincode
- it is allowed that chaincode invoker, target peers belongs to differed organization.
- chaincode partial update: when not all peers upgrade to latest chaincode, is it possible that old chaincode still work
    with inappropriate endorsement config; while with appropriate endorsement policy, we get chaincode fingerprint mismatch error
- chaincode name is not a secret, we can use combination of discovery service and query chaincode installed on peer to get them all
- [FABN-1130] Stop using "init" as default function name
- channel ID length < 250 :initializing configtx manager failed: bad channel ID: channel ID illegal, cannot be longer than 249
- error symptom of run richQuery on levelDB:  `GET_QUERY_RESULT failed: transaction ID: 6b53220f87f791047ba44635f32d07cb667b6439c5df95e9a208d74ab12b5ff2: ExecuteQuery not supported for leveldb`
# DONE
- discovery service, endorsement hints
- [1.4] operation enhance: 
The /metrics endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes.
- private data will automatic sync on new peer(process last for seconds)
# In progress
- collectionConfig.memberOnlyRead is not implemented in sdk-node 


# TODO
- npm couchdb-dump in nodejs/couchdbDump.sh
- level db navigator(https://github.com/Level/level or https://github.com/syndtr/goleveldb) and richQuery for leveldb;leveldb analyzer 
- [1.4] operation enhance: 
    - Metrics can also be pushed to StatsD.
    - check this reference: https://hyperledger-fabric.readthedocs.io/en/release-1.4/metrics_reference.html
- NodeOUs enable
- dig into block event: 
        Dave Enyeart: The block event includes the full transactions of the block, including the read/write sets, which in the case of private data includes the hashes of the private key/values.
- channelEventHub.disconnect status sync
- is private data automatic sync on new peer, with peer amount over max peer count.
- what is peer_chaincode_id and peer_chaincode_path
- how to generate currentBlock hash: nodejs implement of: https://github.com/hyperledger/fabric/blob/master/protoutil/blockutils_test.go#L25        
# Fabric weakness
- keystore object un-promisify: https://gerrit.hyperledger.org/r/#/c/24749/
- endpoint ping: https://gerrit.hyperledger.org/r/#/c/28115/
- fabric RSA key support
- `instantiate policy` is not `endorsemnet policy`, it is used during chaincode packaging/install determining who is able
 to instantiate/upgrade chaincode, it is partially supported in nodejs with chaincode package binary(byte[]) as input. 
 
 *Customizing instantiate policy is not supported in fabric-sdk-node 1.x but in 2.x new chaincode lifecycle*
 
 quoted from Dave Enyeart: 
 
    "They are different, instantiate policy gets packaged with a chaincode and specifies who can instantiate the chaincode, 
    see the doc starting at: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4noah.html#packaging"  
- new Feature required: GetPrivateStateByRangeWithPagination: https://jira.hyperledger.org/browse/FAB-11732
- async or not: CryptoSuite importKey
- [1.4.1] etcdraft does not support non TLS:  consenter info in etcdraft configuration did not specify client TLS cert
- [1.4] cleanup self and promise in fabric-ca-client, channeljs#instantiateChaincode not found
- [TODO] there is not pagination in GetHistoryForKey: Error: QUERY_STATE_NEXT failed
