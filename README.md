# fabric-common

Fabric version 2.5.4

CA version 1.5.7
## Prerequisite
- docker: 18.03 +
### Prerequisite: For development
- golang: 1.15.x
- fabric-sdk-java
    - java: openjdk 11.0.7 2020-04-14
### Prerequisite: [Windows 10 extras](https://hyperledger-fabric.readthedocs.io/en/release-2.0/prereqs.html#windows-extras)
- Git x64: [64-bit Git for Windows Setup](https://github.com/git-for-windows/git/releases/download/v2.25.1.windows.1/Git-2.25.1-64-bit.exe)
- use the Windows PowerShell
- [Docker Desktop Installer for Windows](https://download.docker.com/win/stable/Docker%20Desktop%20Installer.exe)
    - REQUIRE:  Hyper-V and Containers Windows features must be enabled.
- Before `git clone`, run the following:
    - `git config --global core.autocrlf false`
    - `git config --global core.longpaths true`
- [option] For nodejs developer
    - global setup:  **require admin shell**
        - `npm install --global windows-build-tools` and [More Details](https://github.com/davidkhala/fabric-common/wiki/npm-windows-build-tools)
        - npm install --global grpc

## Mono repository components
- [bash](bash)
- [golang](golang)
- [java](java)
- [nodejs](nodejs)

## Milestone
- [2.0]
    - Use only raft for all CFT consensus scenario
    - new lifecycle chaincode
    - admin-service is removed from fabric-sdk-node
    - allow to share private data on-chain
    - chaincode fingerprint check is removed
    - [configtxgen] remove anchor peer file generator, user should update anchor peer vis config update transaction 
## Notes
- [connectionProfile]A connection profile is normally created by an administrator who understands the network topology.
- if random result is included in WriteSet, it corrupts the deterministic process.
- [keystore] For private keys existing in local file system, you should set the permissions to 0400 on *nix based OS.  
- [gRPCs][docker network] **host name SHOULD not include upper-case character, otherwise gRpcs ping for discovery_client will not response back with docker network DNS** 
- individual properties may be overridden by setting environment variables, such as `CONFIGTX_ORDERER_ORDERERTYPE=etcdraft`.
- [keyValue] Value size limit is now available at 4194304 bytes
    - `'Received message larger than max (<yourOverFlowValue> vs. 4194304)'`
- [channel] channel ID length < 250 :initializing configtx manager failed: bad channel ID: channel ID illegal, cannot be longer than 249
- [disaster] backup recovery: at least 1 anchor peer for each organization should be resumed to recover transaction process
- [configtxgen] configtx.yaml: Organization Name and Organization ID can include alphanumeric characters as well as dots and dashes.
- The default ApplicationPolicy is `{channel_config_policy_reference: '/Channel/Application/Endorsement'}` 
- [query][blockEvent] blockHeight (got from GetChainInfo) indexing from 1, blockNumber in blockEvent starting from 0.
- QueryInstalledChaincode/s would not change even after removal source archive, we could refresh it by restarting peer 
     
### Notes: Private Data 

- requirePeerCount <= peerCount - 1 (1 for peer itself)
- "2-of" collectionPolicy is not allowed
- private data work only after manually set anchor peers
- Note that collections cannot be deleted, 
    - as prior private data hashes on the channel’s blockchain cannot be removed.
- private data will automatic sync on new peer(process last for seconds)
- only `OR` is allowed in collection distribution policy(`member_orgs_policy`), see in [Architecture Reference: Private Data](https://hyperledger-fabric.readthedocs.io/en/master/private-data-arch.html)
- [collection-level-endorsement-policies](https://hyperledger-fabric.readthedocs.io/en/master/endorsement-policies.html#setting-collection-level-endorsement-policies)
    - Collection-level endorsement policy override chaincode-level endorsement policy for any data written to the collection
    - if collection-level endorsement policy is unset, instead of having default policy such as `channel_config_policy_reference = '/Channel/Application/Endorsement'`, no collection-level endorsement policy apply.
- implicit collections always use blockToLive=0
### [Notes: Chaincode](CHAINCODE.md)

### [Notes: etcdraft](RAFT.md)

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
- make use of npm jsrsasign
- make use of softHSM in node-sdk
- [2.2] what is the lifecycle function for `peer lifecycle chaincode queryapproved`
- [2.3] Hyperledger Fabric v2.3 introduces two new features for improved orderer and peer operations
        - [Channel Participation]:  Orderer channel management without a system channel
            - translate `osadmin` into part of `khala-fabric-admin`
        - Ledger snapshot
## Fabric weakness
- fabric RSA key support: 
    - not supported as peer|orderer keystore
- new Feature required: GetPrivateStateByRangeWithPagination: https://jira.hyperledger.org/browse/FAB-11732

## Abandoned
- docker-swarm support
- graphiteapp/graphite-statsd not working to receive metrics: push statsD to AWS 
