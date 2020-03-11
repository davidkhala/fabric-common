# fabric-common
[![Build Status](https://travis-ci.com/davidkhala/fabric-common.svg?branch=release-1.4)](https://travis-ci.com/davidkhala/fabric-common)

Current version 1.4.5
## Prerequisite
- docker: 17.06.2-ce +
- docker-compose: 1.14.0 +
- golang: 1.12.x
- fabric-node-sdk:
    - nodejs: 10.x
    - npm: 6 + 
    - Python: 2.7

## Design Notes
- `configtxlator` handler in `nodejs/binManager.js`
- CICD: using travis
## Milestone
- [1.2]
    - [privateData]
- [1.4]
    - [Operations][healthz][metrics][logLevel]
    - [raft]
    - [1.4.3][orderer][FAB-7559] apply new ordering service endpoints config structure
## Notes
- [connectionProfile]A connection profile is normally created by an administrator who understands the network topology.
- if random result is included in WriteSet, it corrupts the deterministic process.
- instantiate/upgrade could be where data migration is performed, if necessary
- [keystore] For private keys existing in local file system, you should set the permissions to 0400 on *nix based OS’s.  
- [gRpcs][docker network] **host name SHOULD not include upper-case character, otherwise gRpcs ping for discovery_client will not response back with docker network DNS** 
- [query]blockHeight(got from queryChain) indexing from 1, blockNumber in blockEvent starting from 0
- [reference]playback conference: https://wiki.hyperledger.org/display/fabric/Playbacks
- [channel]`txId` is required in peer join channel because: [bret Harrison]There is a transaction proposal to the system chaincode, so a transaction id is required.
- [channel][orderer] individual properties may be overridden by setting environment variables, such as `CONFIGTX_ORDERER_ORDERERTYPE=kafka`.
- [channel][system] peer could not join system channel
    ` [Orderer.js]: sendDeliver - rejecting - status:FORBIDDEN`
- [channel]channel ID length < 250 :initializing configtx manager failed: bad channel ID: channel ID illegal, cannot be longer than 249
- [1.4][nodejs][sdk] `Channel#getChannelConfigReadable` could be used to extract application channel from orderer
    - used in migration from kafka to RAFT. When after <appChannel> config is changed to maintenance mode, peer in <appChannel> could not get the latest channel config. At that point, we could extract <appChannel> config from orderer alternatively.   
- [disaster]backup recovery: at least 1 anchor peer for each organization should be resumed to recover transaction process
- [nodejs][sdk]node-gyp rebuild require `make` and `g++` 
- [nodejs][sdk]FABN-1130: Stop using "init" as default function name
- [couchdb]error symptom of run richQuery on levelDB:  `GET_QUERY_RESULT failed: transaction ID: 6b53220f87f791047ba44635f32d07cb667b6439c5df95e9a208d74ab12b5ff2: ExecuteQuery not supported for leveldb`
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
- [raft] Each channel has its own RAFT orderer cluster, but system channel should have a super set of all orderer cluster  -- Jay Guo
- [raft][migrate] migrate from kafka to etcdRaft, see [here](https://github.com/davidkhala/delphi-fabric/tree/release-1.4/operations/migrate/README.md)
- [solo][FAB-15754] Deploy a single-node Raft-based ordering service instead of using solo consensus type
- Block data emitted in block event has a structure documented in [types.js](./nodejs/types.js)  
- [Replay Attack] txID replay validation is done by orderer, the duplicated txID could not be found at next block marked as "invalid transaction"   
### Notes: ChannelEventHub
- for application channel
    - The first block could be replayed is not the channel genesis block (available from `Channel.getGenesisBlock`), but the one after, which is `block.header.number='1'`. 

### Notes: Private Data 

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
- [privateData] private data will automatic sync on new peer(process last for seconds)

### Notes: Chaincode

- [chaincode]peer.response in chaincode.Init cannot be recovered from proposal response. stub.GetState is meaningless in Init 
- [chaincode]transient map context keep persistent when cross chaincode
- [chaincode]it is allowed that chaincode invoker `creator`, target peers belongs to differed organization.
- [chaincode]chaincode name is not a secret, we can use combination of discovery service and query chaincode installed on peer to get them all
- [chaincode]chaincode upgrade could not replace instantiate for fabric-sdk-node: ` Error: could not find chaincode with name 'diagnose'`
- [chaincode][nodejs]nodejs chaincode take longer time in install chaincode only.
- [chaincode][nodejs][FAB-9287] devDependencies and offline chaincode instantiate is not supported yet
- [chaincode][nodejs][contract-api] later contract in `index#exports.contracts` array will overlap to previous one, similar as `Object.assign()`
- [chaincode][nodejs][contract-api] multiple contract in index.js: for invoke function code split
    - contract name: defined in subclass of Contract constructor
        ``` super(`${contractName}`) ```
    - function namespace division: <contract name>:<function name>
    - ledger data is integral for multiple contract  
- [chaincode][nodejs][contract-api] minimum package.json
    ```json
  {
      "main": "index.js", 
      "scripts": {
          "start": "fabric-chaincode-node start"
      },
      "dependencies": {
          "fabric-contract-api": "^1.4.4",
          "fabric-shim": "^1.4.4"
      }
  }    
    ```
    property "name", "version" is useless
       
- [chaincode] call `await stub.putPrivateData('anyCollection', "key", 'value');` without setup collection Config or in Init step:  
    `Error: collection config not define for namespace` 
    See in https://github.com/hyperledger/fabric/commit/8a705b75070b7a7021ec6f897a80898abf6a1e45
- [chaincode][system]System chaincodes are intended to be invoked by a client rather than by a user chaincode
- [chaincode][golang] `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- [chaincode][endorsement]chaincode partial update: when not all peers upgrade to latest chaincode, is it possible that old chaincode still work
      with inappropriate endorsement config; while with appropriate endorsement policy, we get chaincode fingerprint mismatch error
- [chaincode][system] System chaincodes are intended to be invoked by a client rather than by a user chaincode. Invoking from a user chaincode may cause deadlocks.
    [See here](https://jira.hyperledger.org/browse/FAB-15285) 
- [chaincode][instantiate policy]
    - `instantiate policy` is not `endorsemnet policy`, it is used during chaincode packaging/install determining who is able
 to instantiate/upgrade chaincode, it is partially supported in nodejs with chaincode package binary(byte[]) as input. 
    - to customize instantiate policy, we reply on `peer chaincode package` 
### Notes: Operations
[reference](https://hyperledger-fabric.readthedocs.io/en/release-1.4/metrics_reference.html)

- [logLevel] `logspec`:`{"spec":"chaincode=debug:info"}`, the logger is in debug mode and level is info.
- [healthz] In the current version, the only health check that is registered is for Docker. 
- [metrics][TLS] the TLS enable flag located in `Operations` section
- [metrics][TLS] for peer and orderer, even ...OPERATIONS_TLS_CLIENTAUTHREQUIRED=false, client side key-cert is still 
    - required on endpoints: `/metrics`, `/logspec`
    - but not required on endpoints `/healthz`, `/version`
    
    See details in [FAB-14323](https://jira.hyperledger.org/browse/FAB-14323)
- [metrics] The `/metrics` endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes.

## TODO
- npm couchdb-dump in nodejs/couchdbDump.sh
- level db navigator(https://github.com/Level/level or https://github.com/syndtr/goleveldb) and richQuery for leveldb;leveldb analyzer 
- NodeOUs enable and intermediate CA
- channelEventHub.disconnect status sync
- make use of npm jsrsasign
- make use of softHSM in node-sdk
- replace some function in query.js with system chaincode

## Fabric weakness
- fabric RSA key support: 
    - not supported as peer|orderer keystore
- new Feature required: GetPrivateStateByRangeWithPagination: https://jira.hyperledger.org/browse/FAB-11732
- async or not: CryptoSuite importKey

- [1.4] `Channel#getChannelConfigFromOrderer` could not specify target orderer
- client.newTransactionID(); --> new TransactionID(Identity,isAdmin)
- create docker env manager to convert a env jsObject to env list(having same key checking)

- [go mod support]`lib/packager/Golang.js` could not support project outside of GoPath (as usually in go mod)
    - `const projDir = path.join(goPath, 'src', chaincodePath);`
## Abandoned
- what is peer_chaincode_id and peer_chaincode_path
- keystore object un-promisify: https://gerrit.hyperledger.org/r/#/c/24749/
- endpoint ping: https://gerrit.hyperledger.org/r/#/c/28115/
- docker-swarm support
- graphiteapp/graphite-statsd not working to receive metrics: push statsD to AWS 
