# fabric-common
[![Build Status](https://travis-ci.com/davidkhala/fabric-common.svg?branch=release-1.4)](https://travis-ci.com/davidkhala/fabric-common)

Current version 1.4.3
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
- [privateData] collectionConfig.memberOnlyRead
    -  expected symptom: `Error: GET_STATE failed: transaction ID: 35175d5ac4ccaa44ad77257a25caca5999c1a70fdee27174f0b7d9df1c39cfe5: tx creator does not have read access permission on privatedata in chaincodeName:diagnose collectionName: private`
- [golang]dep could only be run under system $GOPATH,
- [chaincode]peer.response in chaincode.Init cannot be recovered from proposal response. stub.GetState is meaningless in Init 
- [chaincode]transient map context keep persistent when cross chaincode
- [chaincode]it is allowed that chaincode invoker `creator`, target peers belongs to differed organization.
- [chaincode]chaincode name is not a secret, we can use combination of discovery service and query chaincode installed on peer to get them all
- [chaincode]chaincode upgrade could not replace instantiate for fabric-sdk-node: ` Error: could not find chaincode with name 'diagnose'`
- [nodejs][chaincode]nodejs chaincode take longer time in install chaincode only.
- [golang][chaincode] `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- [reference]playback conference: https://wiki.hyperledger.org/display/fabric/Playbacks
- [channel]`txId` is required in peer join channel because: [bret Harrison]There is a transaction proposal to the system chaincode, so a transaction id is required.
- [channel]impossible: join channel without orderer
- [channel][orderer] individual properties may be overridden by setting environment variables, such as `CONFIGTX_ORDERER_ORDERERTYPE=kafka`. 
- [channel]channel ID length < 250 :initializing configtx manager failed: bad channel ID: channel ID illegal, cannot be longer than 249
- [1.4][nodejs][sdk] `Channel#getChannelConfigReadable` could be used to extract application channel from orderer
    - used in migration from kafka to RAFT. When after <appChannel> config is changed to maintenance mode, peer in <appChannel> could not get the latest channel config. At that point, we could extract <appChannel> config from orderer alternatively.   
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
    - `[orderer.common.server] initializeClusterClientConfig -> PANI 004 TLS is required for running ordering nodes of type etcdraft.`
    - `ClientTLSCert`, `ServerTLSCert` in configtx.yaml have to be aligned with orderer environment set: 
        ```shell script
                General.Cluster.ClientCertificate = ""
                General.Cluster.ClientPrivateKey = ""
                General.Cluster.RootCAs = []
        ```
        otherwise it will say:
        ```shell script
        I do not belong to channel testchainid or am forbidden pulling it (not in the channel), skipping chain retrieval
        ```
- [1.4.3][orderer][FAB-7559] apply new config structure
## DONE
- discovery service, endorsement hints
- [1.4] operation enhance: 
The /metrics endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes.
- private data will automatic sync on new peer(process last for seconds)
- migrate from kafka to etcdRaft, see [here](https://github.com/davidkhala/delphi-fabric/tree/release-1.4/test/migrate)

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
- make use of npm jsrsasign
- make use of softHSM in node-sdk

## Fabric weakness
- fabric RSA key support
- `instantiate policy` is not `endorsemnet policy`, it is used during chaincode packaging/install determining who is able
 to instantiate/upgrade chaincode, it is partially supported in nodejs with chaincode package binary(byte[]) as input. 
 
 *Customizing instantiate policy is not supported in fabric-sdk-node 1.x but in 2.x new chaincode lifecycle*
 
 quoted from Dave Enyeart: 
 
    "They are different, instantiate policy gets packaged with a chaincode and specifies who can instantiate the chaincode, 
    see the doc starting at: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4noah.html#packaging"  
- new Feature required: GetPrivateStateByRangeWithPagination: https://jira.hyperledger.org/browse/FAB-11732
- async or not: CryptoSuite importKey

- [1.4] `Channel#getChannelConfigFromOrderer` could not specify target orderer
- client.newTransactionID(); --> new TransactionID(Identity,isAdmin)
- create docker env manager to convert a env jsObject to env list(having same key checking)
- [leveldb]QUERY_STATE_NEXT in followings, and how `totalQueryLimit` works?
    - `GetStateByRange`
    - `GetStateByPartialCompositeKey`
    - `GetQueryResult`
    - `GetHistoryForKey`

## Abandoned
- what is peer_chaincode_id and peer_chaincode_path
- keystore object un-promisify: https://gerrit.hyperledger.org/r/#/c/24749/
- endpoint ping: https://gerrit.hyperledger.org/r/#/c/28115/