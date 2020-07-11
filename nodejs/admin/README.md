# khala-fabric-admin
A way to compensate missing admin level node-sdk

## Documents
Code as document at current stage. Raise issue when you get confused. 


## Design
- This derives from 'khala-fabric-sdk-node-builder' design
    - it depends on fabric-sdk components
    - Object-oriented
- channel operation: create, join, update
- chaincode operation: install, Approve, commit

## TODO
- `configDecoder.js`: work as javascript version of configtxlator
- make good use of `fabric-common/lib/ServiceHandler.js`
- service discovery

## Notes
- channel.getChannelConfig(peer) will not be rebuilt, please use event service to get block from peer; or get it from orderer
- `gatePolicy.js`: translator for GateDSL <=> N out of
    - reference: `common/policydsl/policyparser.go`

## Entry Points
- `peer.js` work as [endorser] and [eventer]
- `orderer.js` work as [committer] and [eventer];
		
### Channel create

Channel create is same as channel update action
- See in `channelUpdate.js`, you could use a single envelop or config along with signatures
    as channel configuration content. 


### Channel join
peer joining to a channel in nature is sending a system chaincode proposal to peers
- See in `CSCCProposal.js`, you could extract the genesis block data from a file,    
- Or you could use method `getSpecificBlock` in `signingIdentity.js` to get genesis block from orderer

### Channel Update
Tutorial WIP

### Chaincode Package
There is multiple way we could make archive. My sample use `chaincodePackage.js` in `npm khala-fabric-sdk-node`     

### Chaincode Install
- See in `lifeCycleProposal.installChaincode`

### Chaincode Approve
- See in `lifeCycleProposal.approveForMyOrg`

### Chaincode Commit
- See in `lifeCycleProposal.commitChaincodeDefinition`

### Discovery service
- SlimDiscoveryService in `discovery.js` 
