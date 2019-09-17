# fabric-common
[![Build Status](https://travis-ci.com/davidkhala/fabric-common.svg?branch=release-1.4)](https://travis-ci.com/davidkhala/fabric-common)

Current version 1.4.3
## Installation
- init submodule
    `./install gitSync`
## Language environment
- docker: 17.06.2-ce +
- docker-compose: 1.14.0 +
- golang: 1.11.x
- fabric-node-sdk:
    - nodejs: 8.x
    - npm@5.6 + 
    - Python: 2.7

## Milestone
- [1.2]
    - [privateData]
- [1.4]
    - [healthz]
    - [raft]
## Notes

- [gRpcs][docker network] **host name SHOULD not include upper-case character, otherwise gRpcs ping for discovery_client will not response back with docker network DNS** 
- [query]blockHeight(got from queryChain) indexing from 1, blockNumber in blockEvent starting from 0
- [privateData]requirePeerCount <= peerCount - 1 (1 for peer itself)
- [privateData]"2-of" collectionPolicy is not allowed
- [privateData]private data work only after manually set anchor peers
- [privateData]Note that collections cannot be deleted, 
    as there may be prior private data hashes on the channel’s blockchain that cannot be removed.
- [privateData]call `await stub.putPrivateData('any', "key", 'value');` without setup collection Config or in Init step:  
Error: collection config not define for namespace [node]  
See also in https://github.com/hyperledger/fabric/commit/8a705b75070b7a7021ec6f897a80898abf6a1e45
- [golang]dep could only be run under system $GOPATH,
- [chaincode]peer.response in chaincode.Init cannot be recovered from proposal response. stub.GetState is meaningless in Init 
- [chaincode]transient map context keep persistent when cross chaincode
- [chaincode]it is allowed that chaincode invoker `creator`, target peers belongs to differed organization.
- [chaincode]chaincode name is not a secret, we can use combination of discovery service and query chaincode installed on peer to get them all
- [chaincode]chaincode upgrade could not replace instantiate for fabric-sdk-node: ` Error: could not find chaincode with name 'diagnose'`
- [nodejs][chaincode]nodejs chaincode take longer time in install chaincode only.
- [golang][chaincode] `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- [reference]playback conference: https://wiki.hyperledger.org/doku.php?id=projects/fabric/playbacks
- [channel]`txId` is required in peer join channel because: [bret Harrison]There is a transaction proposal to the system chaincode, so a transaction id is required.
- [channel]impossible: join channel without orderer 
- [channel]channel ID length < 250 :initializing configtx manager failed: bad channel ID: channel ID illegal, cannot be longer than 249
- [disaster]backup recovery: at least 1 anchor peer for each organization should be resumed to recover transaction process   
- [healthz] `logspec`:`{"spec":"chaincode=debug:info"}`, the logger is in debug mode and level is info.
- [endorsement]chaincode partial update: when not all peers upgrade to latest chaincode, is it possible that old chaincode still work
    with inappropriate endorsement config; while with appropriate endorsement policy, we get chaincode fingerprint mismatch error
- [nodejs][sdk]node-gyp rebuild require `make` and `g++` 
- [nodejs][sdk]FABN-1130: Stop using "init" as default function name
- [couchdb]error symptom of run richQuery on levelDB:  `GET_QUERY_RESULT failed: transaction ID: 6b53220f87f791047ba44635f32d07cb667b6439c5df95e9a208d74ab12b5ff2: ExecuteQuery not supported for leveldb`
- [raft] [migration](https://hyperledger-fabric.readthedocs.io/en/release-1.4/kafka_raft_migration.html) requires:
    - orderer down-time tolerance
- [raft] etcdraft does not support [non TLS](https://hyperledger-fabric.readthedocs.io/en/release-1.4/raft_configuration.html)
    - Raft nodes identify each other using TLS pinning, so in order to impersonate a Raft node, an attacker needs to obtain the private key of its TLS certificate. As a result, it is not possible to run a Raft node without a valid TLS configuration.
- [1.4.3][orderer][FAB-7559] apply new config structure
## DONE
- discovery service, endorsement hints
- [1.4] operation enhance: 
The /metrics endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes.
- private data will automatic sync on new peer(process last for seconds)
## In progress
- collectionConfig.memberOnlyRead is not implemented in sdk-node 


## TODO
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
- migrate from kafka to etcdRaft
- make use of npm jsrsasign
         
## Fabric weakness
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

- [1.4] cleanup self and promise in fabric-ca-client, channeljs#instantiateChaincode not found
- [TODO] there is not pagination in GetHistoryForKey: Error: QUERY_STATE_NEXT failed
- client.newTransactionID(); --> new TransactionID(Identity,isAdmin)
- create docker env manager to convert a env jsObject to env list(having same key checking)
- 360 代码扫描工具扫出fabric 1000多个问题

## Abandoned
- what is peer_chaincode_id and peer_chaincode_path
