# fabric-common
[![Build Status](https://travis-ci.com/davidkhala/fabric-common.svg?branch=master)](https://travis-ci.com/davidkhala/fabric-common)

Current version 2.1.0
## Prerequisite
- docker: 17.06.2-ce +
- docker-compose: 1.14.0 +
- golang: 1.13.x
- fabric-node-sdk:
    - nodejs: 10.x
    - npm: 6 + 
    - Python: 2.7
### Prerequisite: [Windows 10 extras](https://hyperledger-fabric.readthedocs.io/en/release-2.0/prereqs.html#windows-extras)
- Git x64: [64-bit Git for Windows Setup](https://github.com/git-for-windows/git/releases/download/v2.25.1.windows.1/Git-2.25.1-64-bit.exe)
- use the Windows PowerShell
- [Docker Desktop Installer for Windows](https://download.docker.com/win/stable/Docker%20Desktop%20Installer.exe)
    - REQUIRE:  
        Windows 10 64-bit: Pro, Enterprise, or Education (Build 15063 or later).  
        Hyper-V and Containers Windows features must be enabled.
- Before `git clone`, run the following:
    - `git config --global core.autocrlf false`
    - `git config --global core.longpaths true`
- [option] For nodejs developer
    - global setup:  **require admin shell**
        - npm install --global windows-build-tools  
            if you see Error "Could+not+install+Visual+Studio+Build+Tools"  
            try to run installer in `C:\Users\<username>\.windows-build-tools\vs_BuildTools` and follow the wizard
        - npm install --global grpc

## Mono repository components
- [bash](./bash)
- [golang](./golang)
- [java](./java)
- [nodejs](./nodejs)

## Design Notes
- CICD: using travis
## Milestone
- [2.0]
    - Use only raft for all CFT consensus scenario
    - new lifecycle chaincode
    - admin-service is removed from fabric-sdk-node
    - allow to share private data on-chain
    - chaincode fingerprint check is removed
    - [configtxgen] remove anchor peer file generator, user should update anchor peer vis config update transaction 
## Notes
- [etcdraft](./RAFT.md)
- [connectionProfile]A connection profile is normally created by an administrator who understands the network topology.
- if random result is included in WriteSet, it corrupts the deterministic process.
- instantiate/upgrade could be where data migration performed, if necessary
- [keystore] For private keys existing in local file system, you should set the permissions to 0400 on *nix based OS.  
- [gRPCs][docker network] **host name SHOULD not include upper-case character, otherwise gRpcs ping for discovery_client will not response back with docker network DNS** 
- [query][blockEvent] blockHeight(got from queryChain) indexing from 1, blockNumber in blockEvent starting from 0. 
    - The latter (above) is not the channel genesis block (available from `Channel.getGenesisBlock`), but the one after, which `block.header.number='1'`.
- [reference]playback conference: https://wiki.hyperledger.org/display/fabric/Playbacks
- individual properties may be overridden by setting environment variables, such as `CONFIGTX_ORDERER_ORDERERTYPE=etcdraft`.
- [channel][system] peer could not join system channel
- [channel]channel ID length < 250 :initializing configtx manager failed: bad channel ID: channel ID illegal, cannot be longer than 249
- [disaster]backup recovery: at least 1 anchor peer for each organization should be resumed to recover transaction process
- [configtxgen]configtx.yaml: Organization Name and Organization ID can include alphanumeric characters as well as dots and dashes.
- [configtxlator] The decoded ConfigUpdate structure
    ```
  { channel_id: 'allchannel',
    isolated_data: {},
    read_set:
     { groups: { Application: [Object] },
       mod_policy: '',
       policies: {},
       values: {},
       version: '0' },
    write_set:
     { groups: { Application: [Object] },
       mod_policy: '',
       policies: {},
       values: {},
       version: '0' } }

    ```
-  chaincode package identifier is the package label combined with a hash of the package      
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

### [Notes: Chaincode](./CHAINCODE.md)

### Notes: Operations
[reference](https://hyperledger-fabric.readthedocs.io/en/release-2.0/metrics_reference.html)

- [logLevel] `logspec`:`{"spec":"chaincode=debug:info"}`, the logger is in debug mode and level is info.
- [healthz] In the current version, the only health check that is registered is for Docker. 
- [metrics][TLS] the TLS enable flag located in `Operations` section
- [metrics][TLS] for peer and orderer, even ...OPERATIONS_TLS_CLIENTAUTHREQUIRED=false, client side key-cert is still 
    - required on endpoints: `/metrics`, `/logspec`
    - but not required on endpoints `/healthz`, `/version`
    
    See details in [FAB-14323](https://jira.hyperledger.org/browse/FAB-14323)
- [metrics] The `/metrics` endpoint allows operators to utilize Prometheus to pull operational metrics from peer and orderer nodes.

### Notes: storage
- [couchdb] Adding too many indexes, or using an excessive number of fields in an index, will degrade the performance of your network. 
    ```
    This is because the indexes are updated after each block is committed. The more indexes need to be updated through “index warming”, the longer it will take for transactions to complete.
    ```
- error symptom of run richQuery on levelDB:  `GET_QUERY_RESULT failed: transaction ID: 6b53220f87f791047ba44635f32d07cb667b6439c5df95e9a208d74ab12b5ff2: ExecuteQuery not supported for leveldb`


## TODO
- npm couchdb-dump in nodejs/couchdbDump.sh
- level db navigator(https://github.com/Level/level or https://github.com/syndtr/goleveldb) and richQuery for leveldb;leveldb analyzer 
- NodeOUs enable and intermediate CA
- channelEventHub.disconnect status sync
- make use of npm jsrsasign
- make use of softHSM in node-sdk
- replace some function in query.js with system chaincode
- What is this:
    - chaincode package: `It is not necessary for organizations to use the same package label.`

## Fabric weakness
- fabric RSA key support: 
    - not supported as peer|orderer keystore
- new Feature required: GetPrivateStateByRangeWithPagination: https://jira.hyperledger.org/browse/FAB-11732
- async or not: CryptoSuite importKey

- client.newTransactionID(); --> new TransactionID(Identity,isAdmin)
- create docker env manager to convert a env jsObject to env list(having same key checking)

- [go mod support]`lib/packager/Golang.js` could not support project outside of GoPath (as usually in go mod)
    - `const projDir = path.join(goPath, 'src', chaincodePath);`
## Abandoned
- docker-swarm support
- graphiteapp/graphite-statsd not working to receive metrics: push statsD to AWS 
